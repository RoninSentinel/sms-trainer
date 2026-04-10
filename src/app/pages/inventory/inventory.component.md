# Inventory Page Component

**Selector:** `app-inventory-page`
**Files:** `inventory.component.ts` · `inventory.component.html` · `inventory.component.scss`

---

## Purpose

The Inventory page is the primary interface for configuring weapon loadouts across all aircraft stations. It allows the operator to:

- Select a weapon station
- Assign a store type (weapon) to that station
- Run a simulated BIT/Verify sequence that validates the loadout
- Clear individual stores or deselect a station entirely

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Title Bar  ("Inventory" or "Inventory: Station N") │
├─────────────────────────────────────────────────────┤
│  Control Section                                    │
│  [Clear Store] [Clear Station] [Settings] [Verify]  │
├─────────────────────────────────────────────────────┤
│  Page Section                                       │
│  [Sta 2] [Sta 3] [Sta 5] [Sta 6]  ← station row   │
│                                                     │
│  ┌─ Store Type Selection ────────────────────────┐  │
│  │ [GBU12] [GBU49] [GBU38] [GBU12T] ...        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Station Detail (store, status, launcher)           │
└─────────────────────────────────────────────────────┘
```

---

## State

### Local Signals

| Signal | Type | Description |
|--------|------|-------------|
| `selectedStationId` | `number \| null` | Station currently selected on this page. Kept in sync with `sms.selectedStationId`. |
| `verifyState` | `'idle' \| 'in-progress' \| 'done'` | Tracks the lifecycle of the simulated BIT/Verify sequence. |

### Computed

| Computed | Description |
|----------|-------------|
| `selectedStation` | Derives the full `Station` object for the currently selected station ID, or `undefined` if none is selected. |
| `titleBar` | Returns `'Inventory'` when no station is selected, or `'Inventory: Station N'` when one is. |
| `canClearStore` | `true` only when a station is selected and has a store assigned (`storeType !== ''`). Controls the enabled state of the **Clear Store** button. |

### Service State

The component reads `sms.stations` directly and writes back via service methods. It also keeps `sms.selectedStationId` in sync so other pages (e.g. Store Settings, Release Settings) know which station is active.

---

## Station Buttons

Only stations where `loadable === true` are rendered. The default station list is:

| ID | Loadable | Notes |
|----|----------|-------|
| 1  | No | Non-weapon station |
| 2  | Yes | M310 launcher, 2 substations |
| 3  | Yes | Single-store |
| 5  | Yes | Single-store |
| 6  | Yes | M310 launcher, 2 substations |
| 7  | No | Non-weapon station |

---

## Store Type Options

The `storeTypeOptions` array defines all selectable weapon types. Each entry has a `label` (display text), `value` (`StoreType`), and `trainer` flag.

| Label | StoreType | Trainer |
|-------|-----------|---------|
| GBU12 Legacy | `GBU12` | No |
| GBU49 Legacy | `GBU49` | No |
| GBU38 Legacy | `GBU38` | No |
| GBU12T Legacy | `GBU12` | Yes |
| GBU49T Legacy | `GBU49` | Yes |
| GBU38T Legacy | `GBU38` | Yes |
| M310 Dual HF | `Hellfire` | No |
| M310T HF Trn | `Hellfire` | Yes |
| GBU54 | `GBU54` | No |

Trainer buttons are visually distinguished with a dimmed border and a small `TRAINER` label badge rendered via `.trainer-label`. The `isTrainer` flag is persisted to the `Station` object in `SmsService` via `setStationStoreType`.

The store type grid is only shown when a station is selected and no verify is in progress.

---

## Methods

### `selectStation(id: number)`
Sets `selectedStationId` locally and on `sms.selectedStationId`. Both must stay in sync so other pages reflect the correct active station.

### `assignStore(type: StoreType, trainer: boolean)`
Assigns a weapon to the currently selected station:
1. Guards against `null` selection and non-loadable stations.
2. Calls `sms.setStationStoreType(id, type, trainer)` — this handles Hellfire substation creation/preservation and stores the `isTrainer` flag.
3. Sets `storeStatus` to `'UNVRFD'` on the station and all substations, indicating the loadout has changed and must be re-verified.

### `clearStore()`
Removes the weapon from the selected station:
1. Calls `sms.setStationStoreType(id, '')` — strips `storeType`, `isTrainer`, `substations`, and `launcher`.
2. Sets `storeStatus` to `''` on the station.

### `clearStation()`
Removes the weapon and deselects the station:
1. Calls `clearStore()`.
2. Sets both `selectedStationId` and `sms.selectedStationId` to `null`.

### `startVerify()`
Simulates a BIT/Verify sequence:
1. Sets `verifyState` to `'in-progress'`, which shows the verify banner and disables the verify button.
2. After 2.5 seconds, sets `verifyState` to `'done'` and updates all stations:
   - Stations with a store → `storeStatus: 'IDLE'`
   - Stations without a store → `storeStatus: ''`
   - Same logic applied to all substations.

### `cancelVerify()`
Aborts the in-progress verify sequence and returns `verifyState` to `'idle'`.

### `modify()`
Returns `verifyState` from `'done'` back to `'idle'`, re-enabling the store type grid for edits.

---

## Verify Flow

```
idle
 │
 ├─[Start Verify]──► in-progress  (2.5s timeout, shows spinner banner)
 │                        │
 │              ┌─[Cancel]┤
 │              │         │
 │           idle        (2.5s)
 │                        │
 │                       done  (all stations set to IDLE)
 │                        │
 └──────────[Modify]──────┘
```

The **Start Verify** button is hidden once the sequence completes. In its place, a **Modify** button appears to return the page to edit mode.

---

## Status Colours

Status chips delegate to `sms.getStatusClass(status)`:

| Class | Statuses |
|-------|----------|
| `status-yellow` | `UNVRFD`, `WARN`, `MINREL`, `DEGRD` |
| `status-red` | `INVLD`, `ERROR`, `FAILED`, `HUNG` |
| `status-green` | `REL`, `AWAY`, `BIT`, `READY`, `IDLE`, `JET`, `JETTED`, `AUR`, `IBIT`, `WARMUP` |
| `status-black` | `''` (empty / unloaded) |
