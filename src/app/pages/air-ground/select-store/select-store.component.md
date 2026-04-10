# SelectStoreComponent Technical Documentation

## Select Store — Weapon Type Selection & Power Management

**File:** `src/app/pages/air-ground/select-store/select-store.component.ts`
**Selector:** `app-select-store`
**Route:** Air-Ground workflow, Select Store sub-page
**Dependencies:** `SmsService`, `GuardedButtonComponent`

---

## Purpose

`SelectStoreComponent` is the weapon type selection page in the Air-Ground workflow. It presents the operator with a list of weapon types currently loaded on the aircraft, allowing them to:

1. **Select** a weapon type for employment (which also powers it on and runs the Built-In Test sequence)
2. **Deselect** the current weapon type
3. **Set Single** — select without toggling
4. **Power Off** a weapon type via a guarded (two-click) button

This page is the entry point for the Air-Ground workflow. The operator must select a store type here before navigating to Store Settings, Select Target, or Release Settings.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   SelectStoreComponent                       │
│                                                             │
│  ┌─────────────────┐    ┌────────────────────────────────┐  │
│  │   storeRows[]   │    │  availableStores (computed)     │  │
│  │                 │───>│  Filters storeRows by what's    │  │
│  │ Static catalog  │    │  actually loaded on stations    │  │
│  │ of weapon types │    └────────────────────────────────┘  │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐    ┌────────────────────────────────┐  │
│  │  selectedType   │    │  BIT Sequence Engine            │  │
│  │  (signal)       │    │  powerOnAndRunBit() →           │  │
│  │                 │    │    runBitSequence() →            │  │
│  │  Local to this  │    │      setStatusForType()         │  │
│  │  component      │    └────────────────────────────────┘  │
│  └─────────────────┘                                        │
│         │                         │                         │
│         ▼                         ▼                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    SmsService                         │   │
│  │  stations, selectedStationId, linkState               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Store Rows Catalog

The component maintains a static catalog of all possible weapon types. Each entry maps a `StoreType` to its display properties:

| Type      | Label          | Short Name | Family   | Icon                           |
| --------- | -------------- | ---------- | -------- | ------------------------------ |
| `GBU12`   | GBU12 Legacy   | GB12       | GBU      | `assets/weapon-icons/GBU.png` |
| `GBU49`   | GBU49 Legacy   | GB49       | GBU      | `assets/weapon-icons/GBU.png` |
| `GBU48`   | GBU48 Legacy   | GB48       | GBU      | `assets/weapon-icons/GBU.png` |
| `GBU38`   | GBU38 Legacy   | GB38       | GBU      | `assets/weapon-icons/GBU.png` |
| `Hellfire`| Hellfire       | Hellfire   | Hellfire | `assets/weapon-icons/hellfire.png`     |

Only rows whose type matches a currently loaded station appear in the UI (see `availableStores()`).

---

## Type Mapping Rules

The `availableStores()` computed signal applies these mapping rules before filtering:

| Station StoreType | Maps To       | Reason                                          |
| ----------------- | ------------- | ----------------------------------------------- |
| `AWM`             | *(skipped)*   | AWM is a sub-munition inside Hellfire launchers  |
| `M36`             | *(skipped)*   | M36 does not get its own Select Store row        |
| All others        | *(as-is)*     | Direct match to a `storeRows` entry             |

If no stations have loaded stores (all types are empty), the template renders a "No stores available" message via the `@empty` block.

---

## BIT Sequences

When a powered weapon type is selected, the component runs a Built-In Test (BIT) sequence that simulates the real weapon power-on process. Each weapon family has its own sequence of status transitions:

### Hellfire
| Step | Status  | Duration |
| ---- | ------- | -------- |
| 1    | `IDLE`  | 2000 ms  |
| 2    | `BIT`   | 3000 ms  |
| 3    | `IDLE`  | 5000 ms  |
| 4    | `READY` | final    |

### GBU-38
| Step | Status   | Duration |
| ---- | -------- | -------- |
| 1    | `IBIT`   | 3000 ms  |
| 2    | `WARMUP` | 5000 ms  |
| 3    | `DEGRD`  | 4000 ms  |
| 4    | `AUR`    | final    |

### GBU-49 / GBU-54 / GBU-48
| Step | Status   | Duration |
| ---- | -------- | -------- |
| 1    | `IBIT`   | 3000 ms  |
| 2    | `WARMUP` | 5000 ms  |
| 3    | `DEGRD`  | 4000 ms  |
| 4    | `AUR`    | final    |

### GBU-12
| Step | Status  | Duration |
| ---- | ------- | -------- |
| 1    | `READY` | immediate |

GBU-12 is an unguided weapon and requires no power-on sequence.

### Power-On Flow

```
selectStore(type)
  └─ canBePowered(type)?
     ├─ No  → selection only (GBU-12, AWM, M36)
     └─ Yes → powerOnAndRunBit(type)
              ├─ Set linkState to BLINK_GREEN
              ├─ After 1500ms:
              │   ├─ Set linkState to GREEN
              │   ├─ Set storePower = true on all matching stations/substations
              │   └─ runBitSequence(type)
              │       └─ Walk through BIT_SEQUENCES steps with setTimeout delays
              │           └─ Each step calls setStatusForType() to update storeStatus
              └─ All timers stored in bitTimers[] for cleanup on destroy
```

---

## Methods

### Public (Template-Bound)

| Method                     | Parameters   | Description                                                                                          |
| -------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `isSelected(type)`         | `StoreType`  | Returns `true` if `type` matches the current selection                                               |
| `isStorePowered(type)`     | `StoreType`  | Returns `true` if any station of `type` has `storePower === true`                                    |
| `isPowerDisabled(type)`    | `StoreType`  | Returns `true` for types that cannot be powered (`GBU12`, `AWM`, `M36`, empty)                       |
| `selectStore(type)`        | `StoreType`  | Toggles selection. On select: sets `selectedStationId`, powers on if applicable. On deselect: clears. |
| `setSingle(type)`          | `StoreType`  | Sets selection to `type` without toggle behavior                                                     |

### Protected (Template-Bound via GuardedButton)

| Method                     | Parameters   | Description                                                                    |
| -------------------------- | ------------ | ------------------------------------------------------------------------------ |
| `executePowerOff(type)`    | `StoreType`  | Powers off all stations and substations of the given type, resets status to IDLE |

### Private

| Method                        | Parameters               | Description                                                    |
| ----------------------------- | ------------------------ | -------------------------------------------------------------- |
| `powerOnAndRunBit(type)`      | `StoreType`              | Flashes LNK, powers on stations, then starts BIT sequence      |
| `runBitSequence(type)`        | `StoreType`              | Walks through the BIT_SEQUENCES steps with scheduled timeouts  |
| `setStatusForType(type, status)` | `StoreType`, `StoreStatus` | Updates storeStatus on all matching stations and substations |

---

## Standalone Functions

These are module-level helper functions, not component methods:

| Function              | Parameters   | Returns   | Description                                                        |
| --------------------- | ------------ | --------- | ------------------------------------------------------------------ |
| `getBitKey(type)`     | `StoreType`  | `string`  | Maps a store type to its BIT sequence key (e.g., `GBU38` → `GBU38`) |
| `canBePowered(type)`  | `StoreType`  | `boolean` | Returns `true` if the weapon type supports aircraft power           |

---

## Template Structure

```html
title-bar
  └─ "Air To Ground: Select Store"

page-layout-full
  └─ store-list
     └─ @for (store of availableStores)
        └─ store-row [.store-selected if active]
           ├─ store-icon
           │   └─ table
           │       ├─ store-name (label text, colored by family)
           │       └─ store-icon-img (weapon image, sized by family)
           └─ store-btns
               ├─ Select / Deselect button
               ├─ Single button
               └─ app-guarded-button (Power Off, brass curtain, 5s auto-close)

     └─ @empty
        └─ empty-message ("No stores available")
```

---

## Styling

### Family-Specific Image Sizing

Weapon icons are sized per family to account for different image aspect ratios:

| Family             | Max Height | Max Width |
| ------------------ | ---------- | --------- |
| GBU (`.family-gbu`) | 32px       | 100px     |
| Hellfire (`.family-hellfire`) | 48px | 130px  |

### Key CSS Classes

| Class              | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `.store-row`       | Flex row for a single weapon type                    |
| `.store-selected`  | Cyan border + dark background on the selected row    |
| `.store-icon`      | Fixed 200px-wide area for label + image              |
| `.store-icon-img`  | Weapon image with `object-fit: contain`              |
| `.store-name`      | Monospace label text                                 |
| `.family-gbu`      | Green text color for GBU family                      |
| `.family-hellfire` | Green text color for Hellfire family                 |
| `.empty-message`   | Shown when no stores are loaded                      |

---

## Lifecycle

### OnDestroy

The component implements `OnDestroy` to clear all pending BIT sequence timers (`bitTimers[]`). This prevents stale `setTimeout` callbacks from modifying service state after the component is destroyed (e.g., when navigating away from the Select Store page mid-BIT).

---

## Service Interactions

| SmsService Signal     | Read/Write | Usage                                                       |
| --------------------- | ---------- | ----------------------------------------------------------- |
| `stations`            | Read/Write | Reads to determine available types; writes to toggle power  |
| `selectedStationId`   | Write      | Set to first matching station on select, null on deselect   |
| `linkState`           | Write      | Set to `BLINK_GREEN` during power-on, then `GREEN`          |

---

## Testing

Test file: `select-store.component.spec.ts`

Tests are organized into 11 sections:

1. **Component creation** — basic instantiation
2. **availableStores()** — filters by station types, skips AWM/M36, handles empty, deduplicates
3. **isSelected()** — false by default, true for selected, false for others
4. **isStorePowered()** — checks station power state
5. **isPowerDisabled()** — true for GBU12/AWM/M36/empty, false for Hellfire/GBU38
6. **selectStore()** — selects, deselects, switches types, triggers power-on + BIT
7. **setSingle()** — sets selection and station ID without toggle
8. **executePowerOff()** — powers off matching stations + substations, leaves others untouched
9. **ngOnDestroy()** — verifies BIT timers are cleared
10. **DOM empty state** — "No stores available" message visibility
11. **DOM store rows** — correct row count, labels, icons, and selected styling

---

## Related Files

| File                                     | Relationship                                    |
| ---------------------------------------- | ----------------------------------------------- |
| `sms.service.ts`                         | Central state — stations, power, link indicator |
| `guarded-button.component.ts`            | Reusable two-click safety button (Power Off)    |
| `store-settings.component.ts`            | Next step — configure selected weapon settings  |
| `select-target.component.ts`             | Target assignment for selected weapon            |
| `release-settings.component.ts`          | Release parameters for selected weapon           |
| `assets/weapon-icons/GBU.png`   | GBU family weapon icon                          |
| `assets/weapon-icons/GBU.png`   | GBU38 family weapon icon                        |
| `assets/weapon-icons/hellfire.png`       | Hellfire family weapon icon                     |
