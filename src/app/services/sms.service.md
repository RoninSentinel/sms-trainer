# SmsService Technical Documentation

## SMS Trainer — Central State Management

**File:** `src/app/services/sms.service.ts`
**Provided in:** `root` (singleton, shared across the entire application)
**Dependencies:** `StatePersistenceService`

---

## Purpose

`SmsService` is the single source of truth for all shared application state in the SMS Trainer. Every page and component that needs to read or modify weapon stations, targets, settings, or indicators does so through this service. It replaces what would be a backend database in a live system — since the trainer runs entirely in the browser, `SmsService` holds the complete simulated state of the MQ-9 Stores Management System.

The service has three responsibilities:

1. **Store reactive state** as Angular signals that components can read and write
2. **Persist state automatically** to `localStorage` so it survives page refresh
3. **Provide default factories and accessors** for weapon-specific settings

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        SmsService                            │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │   Signals    │  │  Computed   │  │   Methods            │ │
│  │             │  │  Signals    │  │                      │ │
│  │ stations    │  │             │  │ getGbuSettings()     │ │
│  │ savedTargets│  │ armedSta-  │  │ setGbuSettings()     │ │
│  │ gbuSettings │  │   tions    │  │ getHellfireSettings() │ │
│  │ hellfireSe- │  │ warning-   │  │ resetToDefaults()    │ │
│  │   ttings    │  │   Count    │  │ getStoreFamily()     │ │
│  │ storeAssign-│  │             │  │ getStatusClass()     │ │
│  │   ments     │  │             │  │ getNextStationId()   │ │
│  │ ...12 more  │  │             │  │ ...                  │ │
│  └──────┬──────┘  └─────────────┘  └──────────────────────┘ │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  effect() — auto-save                                   │ │
│  │  Reads all signals → builds StateSnapshot → saves       │ │
│  └──────────────────────┬──────────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────────┘
                          ▼
              ┌───────────────────────┐
              │ StatePersistenceService│
              │                       │
              │ save() → localStorage │
              │ load() ← localStorage │
              │ clear()               │
              └───────────────────────┘
```

---

## Type Definitions

### Station & Substation Types

| Type          | Description                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `StoreStatus` | All possible status LED values: `IDLE`, `READY`, `UNVRFD`, `ERROR`, `HUNG`, `AWAY`, etc. Determines indicator color.                                                     |
| `StoreType`   | Weapon type on a station: `GBU12`, `GBU38`, `GBU49`, `GBU54`, `GBU48`, `Hellfire`, `M36`, `AWM`, or `''` (empty).                                                |
| `SubStation`  | A single munition position on a multi-store launcher (e.g., position `2-1` on an M310 rack).                                                                             |
| `Station`     | One of six physical weapon stations on the aircraft (1, 2, 3, 5, 6, 7). Station 4 is reserved. Stations 2 and 6 have `substations` arrays for their M310 dual launchers. |

### Indicator Types

| Type        | Values                                                | Description                       |
| ----------- | ----------------------------------------------------- | --------------------------------- |
| `LinkState` | `RED`, `BLINK_YELLOW`, `GREEN`, `BLINK_GREEN`         | Data-link connection status       |
| `StsState`  | `RED`, `BLINK_RED`, `YELLOW`, `BLINK_YELLOW`, `GREEN` | System warnings/cautions severity |

### Weapon Settings Interfaces

| Interface          | Applies To             | Key Fields                                                             |
| ------------------ | ---------------------- | ---------------------------------------------------------------------- |
| `GbuSettings`      | All GBU variants        | `prf`, `fuzeArm`, `impactAngle`, `offsetN/E/D`, `guidanceMode`        |
| `HellfireSettings` | AGM-114                | `laserCode`, `seekerMode`, `launchMode`, `tmPower`, `warheadType`      |
| `ReleaseSettings`  | All weapons            | `runInMode`, `rippleCount`, `rippleInterval`, `releaseMode`, `cueMode` |

### Target Type

| Interface     | Description                                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SavedTarget` | A target with `name`, `lat`, `lon`, `alt`, `altRef` (elevation datum), and `source` (how it was created). The `altRef` field supports `MSL-84`, `HAE-84`, and `MSL-96` datums per TO 1Q-9(M)A-34-1-1. |

### Profile Type

| Interface | Description                                                                                                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Profile` | A weapon employment profile for quick-switching configurations. Fields: `id` (number), `storeType` (string), `target` (string), `prf` (string), `active` (boolean), `enabled` (boolean). Up to 8 can be stored. |

---

## Signals Reference

### Global Indicators

| Signal              | Type             | Default   | Description                                                        |
| ------------------- | ---------------- | --------- | ------------------------------------------------------------------ |
| `linkState`         | `LinkState`      | `'GREEN'` | Data-link indicator in the header bar                              |
| `stsState`          | `StsState`       | `'GREEN'` | System status indicator in the header bar                          |
| `selectedStationId` | `number \| null` | `null`    | Currently selected station, shared across all Air-Ground sub-pages |

### Station Inventory

| Signal     | Type        | Default            | Description                                                                                                                                                      |
| ---------- | ----------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stations` | `Station[]` | 6 default stations | The complete loadout. Station 2 and 6 have Hellfire M310 launchers with 2 substations each. Station 1 has GBU12, Station 7 has GBU49, Stations 3 and 5 have AWM. |

### Weapon Settings (Per-Station Maps)

Each is a `Record<number, Settings>` keyed by station ID. They start empty `{}` and are lazily initialized via the `get*Settings()` accessors.

| Signal             | Type                               | Description                                  |
| ------------------ | ---------------------------------- | -------------------------------------------- |
| `gbuSettings`      | `Record<number, GbuSettings>`      | GBU-series bomb settings (all variants)      |
| `hellfireSettings` | `Record<number, HellfireSettings>` | AGM-114 Hellfire missile settings            |
| `releaseSettings`  | `Record<number, ReleaseSettings>`  | Release/tactical settings (all weapon types) |

### Targets

| Signal               | Type                       | Default | Description                                                                   |
| -------------------- | -------------------------- | ------- | ----------------------------------------------------------------------------- |
| `savedTargets`       | `SavedTarget[]`            | `[]`    | User-created targets. Starts empty per the demo video.                        |
| `selectedTargetName` | `string`                   | `''`    | Name of the currently selected target                                         |
| `storeAssignments`   | `Record<string, string[]>` | `{}`    | Maps target name → assigned store IDs. Example: `{ 'CCTGP': ['2-1', '6-1'] }` |

### Profiles & Warnings

| Signal     | Type               | Default                    | Description                                                   |
| ---------- | ------------------ | -------------------------- | ------------------------------------------------------------- |
| `profiles` | `Profile[]`        | 8 profiles, only #1 active | Weapon employment profiles for quick-switching configurations |
| `warnings` | `{ level, msg }[]` | 1 default caution          | Active warnings and cautions shown on the Status page         |

### Non-Persisted State

| Property | Type                        | Description                                                                 |
| -------- | --------------------------- | --------------------------------------------------------------------------- |
| `eoir`   | `{ lat, lon, alt, altRef }` | Simulated MTS sensor position. Not persisted — represents live sensor data. |
| `mtsPrf` | `string` (`'1122'`)         | MTS laser PRF code. Static.                                                 |

---

## Computed Signals

| Computed        | Type        | Derivation                                                             |
| --------------- | ----------- | ---------------------------------------------------------------------- |
| `armedStations` | `Station[]` | All stations where `storeType` is non-empty AND `storePower` is `true` |
| `warningCount`  | `number`    | Length of the `warnings` array                                         |

---

## Lifecycle

### Construction (App Startup / Page Refresh)

```
1. Angular creates SmsService singleton
2. All signals initialize to hardcoded defaults
3. constructor() calls hydrateFromStorage()
   └─ StatePersistenceService.load() reads localStorage
   └─ If a valid snapshot exists, each signal is .set() to the saved value
   └─ If no snapshot or version mismatch, signals keep their defaults
4. constructor() sets up effect()
   └─ Reads every signal (registers as dependency)
   └─ Schedules a coalescing save via setTimeout(0)
```

### During Normal Use

```
Component calls: sms.savedTargets.update(list => [...list, newTarget])
  └─ Signal value changes
  └─ effect() re-runs (Angular scheduler)
     └─ Builds StateSnapshot from all signal values
     └─ Cancels any pending save timeout
     └─ Schedules new setTimeout(0) → persistence.save(snapshot)
```

Multiple signal writes in the same synchronous call stack (e.g., `Apply To Type` updating 4 stations) coalesce into a single `localStorage` write.

### Reset

```
sms.resetToDefaults()
  └─ persistence.clear()        — removes localStorage entry
  └─ Every signal .set() back to factory default
  └─ effect() fires → saves the fresh defaults to localStorage
```

---

## Methods

### Settings Accessors (Lazy-Init Pattern)

These follow a consistent pattern: check if the station has settings in the map; if not, initialize to defaults; return the settings.

| Method                           | Returns            | Description                                      |
| -------------------------------- | ------------------ | ------------------------------------------------ |
| `getGbuSettings(stationId)`      | `GbuSettings`      | Get or lazy-init GBU settings for a station      |
| `getHellfireSettings(stationId)` | `HellfireSettings` | Get or lazy-init Hellfire settings for a station |
| `getReleaseSettings(stationId)`  | `ReleaseSettings`  | Get or lazy-init release settings for a station  |

**Usage pattern in a component:**

```typescript
// Read (lazy-inits if first access):
this.gbu = this.sms.getGbuSettings(stationId);

// Modify locally, then persist:
this.gbu.prf = '1688';
this.sms.setGbuSettings(stationId, { ...this.gbu });
```

### Settings Mutators

| Method                                     | Parameters                   | Description                       |
| ------------------------------------------ | ---------------------------- | --------------------------------- |
| `setGbuSettings(stationId, settings)`      | `number`, `GbuSettings`      | Persist updated GBU settings      |
| `setHellfireSettings(stationId, settings)` | `number`, `HellfireSettings` | Persist updated Hellfire settings |
| `setReleaseSettings(stationId, settings)`  | `number`, `ReleaseSettings`  | Persist updated release settings  |

### Default Factories

Each returns a new object every time (safe to mutate).

| Method              | Returns            | Notable Defaults                                            |
| ------------------- | ------------------ | ----------------------------------------------------------- |
| `defaultGbu()`      | `GbuSettings`      | PRF `1511`, fuze `SAFE`, impact angle `65°`                 |
| `defaultHellfire()` | `HellfireSettings` | Laser code `1122`, seeker `LOAL`, launch `Direct`           |
| `defaultRelease()`  | `ReleaseSettings`  | Ripple count `1`, interval `0.32s`, mode `CCRP`             |

### Utility Methods

| Method                        | Parameters    | Returns                                    | Description                                                              |
| ----------------------------- | ------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| `getStoreFamily(type)`        | `StoreType`   | `'GBU' \| 'Hellfire' \| 'Other'`            | Maps a weapon type to its family for UI panel switching                  |
| `getStatusClass(status)`      | `StoreStatus` | CSS class string                           | Returns `status-green`, `status-yellow`, `status-red`, or `status-black` |
| `getStationIndex(stationId)`  | `number`      | `number`                                   | Array index of a station, or `-1`                                        |
| `getNextStationId(stationId)` | `number`      | `number \| null`                           | ID of the next station in order, or `null` at end                        |
| `getPrevStationId(stationId)` | `number`      | `number \| null`                           | ID of the previous station, or `null` at start                           |

### State Management

| Method              | Description                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `resetToDefaults()` | Clears `localStorage` and resets every signal to factory defaults. Use for "New Session" / "Reset Trainer". |

---

## Default Station Configuration

The trainer initializes with this loadout, matching the demo video's starting state:

| Station | Store Type | Status | Power | Launcher | Substations                    |
| ------- | ---------- | ------ | ----- | -------- | ------------------------------ |
| 1       | GBU12      | IDLE   | On    | —        | —                              |
| 2       | Hellfire   | IDLE   | On    | M310     | 2-1 (Hellfire), 2-2 (Hellfire) |
| 3       | AWM        | IDLE   | Off   | —        | —                              |
| 5       | AWM        | IDLE   | Off   | —        | —                              |
| 6       | Hellfire   | IDLE   | On    | M310     | 6-1 (Hellfire), 6-2 (AWM)      |
| 7       | GBU49      | UNVRFD | Off   | —        | —                              |

Station 4 is not present (reserved on this airframe).

---

## Status Class Mapping

The `getStatusClass()` method maps store statuses to CSS classes for indicator coloring:

| CSS Class       | Statuses                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| `status-green`  | `IDLE`, `READY`, `REL`, `AWAY`, `BIT`, `JET`, `JETTED`, `AUR`, `IBIT`, `WARMUP` |
| `status-yellow` | `UNVRFD`, `WARN`, `MINREL`, `DEGRD`                                             |
| `status-red`    | `INVLD`, `ERROR`, `FAILED`, `HUNG`                                              |
| `status-black`  | Empty string (no store loaded)                                                  |

---

## Store Family Mapping

The `getStoreFamily()` method maps weapon types to families for UI branching:

| Family     | Store Types                                 |
| ---------- | ------------------------------------------- |
| `GBU`      | `GBU12`, `GBU38`, `GBU49`, `GBU54`, `GBU48` |
| `Hellfire` | `Hellfire`                                  |
| `Other`    | `AWM`, `M36`, `''` (empty)                  |

> **Note:** The `StoreSettingsComponent` uses a more specific `storeVariant` computed signal that differentiates `GBU12` from `GBU-Complex` (GBU-38/49/54/48) because their settings panels differ. `getStoreFamily()` alone does not make this distinction.

---

## Usage Examples

### Reading state in a component

```typescript
@Component({ ... })
export class MyComponent {
  private readonly sms = inject(SmsService);

  // Alias signals for template binding
  protected readonly targets = this.sms.savedTargets;
  protected readonly stations = this.sms.stations;

  // Use in template: @for (t of targets(); track t.name) { ... }
}
```

### Modifying state

```typescript
// Add a target
this.sms.savedTargets.update((list) => [...list, newTarget]);

// Select a station
this.sms.selectedStationId.set(2);

// Update weapon settings
const gbu = this.sms.getGbuSettings(1);
gbu.prf = '1688';
this.sms.setGbuSettings(1, { ...gbu });

// Toggle station power
this.sms.stations.update((list) => list.map((s) => (s.id === 2 ? { ...s, storePower: !s.storePower } : s)));
```

### Resetting everything

```typescript
// From a "Reset Trainer" button handler:
this.sms.resetToDefaults();
```

---

## Testing

When writing tests for components that use `SmsService`, be aware of two things:

**1. Clear localStorage in `beforeEach`** to prevent state leaking between test suites:

```typescript
beforeEach(async () => {
  localStorage.removeItem('sms-trainer-state');
  await TestBed.configureTestingModule({ ... }).compileComponents();
});
```

**2. For SmsService unit tests**, provide a mock `StatePersistenceService` to control hydration:

```typescript
const mockPersistence = jasmine.createSpyObj('StatePersistenceService', ['save', 'load', 'clear']);
mockPersistence.load.and.returnValue(null); // start with defaults

TestBed.configureTestingModule({
  providers: [{ provide: StatePersistenceService, useValue: mockPersistence }],
});
```

---

## Related Files

| File                            | Relationship                                                   |
| ------------------------------- | -------------------------------------------------------------- |
| `state-persistence.service.ts`  | Low-level localStorage read/write. Defines `StateSnapshot`.    |
| `select-target.component.ts`    | Reads `savedTargets`, `storeAssignments`, `selectedTargetName` |
| `store-settings.component.ts`   | Reads/writes `gbuSettings`, `hellfireSettings`                 |
| `release-settings.component.ts` | Reads/writes `releaseSettings`                                 |
| `select-store.component.ts`     | Reads `stations`, writes `selectedStationId`                   |
| `inventory.component.ts`        | Writes `stations` (loadout changes)                            |
| `app.component.ts`              | Reads `linkState`, `stsState` for header indicators            |
| `loadout-display.component.ts`  | Reads `stations` for the top-bar station overview              |
