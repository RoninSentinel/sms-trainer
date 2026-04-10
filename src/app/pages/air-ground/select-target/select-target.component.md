# Select Target Page — Technical Documentation

## SMS Trainer — Air To Ground: Select Target

**File:** `src/app/pages/air-ground/select-target/select-target.component.ts`
**Template:** `select-target.component.html`
**Styles:** `select-target.component.scss`
**Route:** `/air-ground/select-target` (child of the Air-Ground layout)
**Reference:** TO 1Q-9(M)A-34-1-1, Figures 1-76 through 1-89

---

## Purpose

The Select Target page is where the operator manages all targeting for weapon employment. It allows the user to view the cross-cued target (CCTGP), create and modify saved targets, assign weapon stores to targets, and configure the heading reference. This page is the central hub for target data — the targets created here are referenced by Release Settings, Launch Status, and Profiles.

---

## Page Architecture

The component renders one of three mutually exclusive views controlled by the `activeView` property:

```
┌──────────────────────────────────────────────────────────────┐
│                    activeView = 'select'                     │
│                                                              │
│  ┌─ Cross-Cued Targets ──────────────────────────────────┐   │
│  │  CCTGP card  │  Store Assign btn  │  Auto/Manual btn  │   │
│  └────────────────────────────────────────────────────────┘   │
│  ┌─ Saved Targets ───────────────────────────────────────┐   │
│  │  Target row  │  Select btn  │  Modify btn  │  ↑  ↓    │   │
│  │  Target row  │  Select btn  │  Modify btn  │          │   │
│  │  Target row  │  Select btn  │  Modify btn  │          │   │
│  └────────────────────────────────────────────────────────┘   │
│  ┌─ Footer ──────────────────────────────────────────────┐   │
│  │  [Create Target]                        [True / Mag]  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Store Popup (overlay, optional) ─────────────────────┐   │
│  │  Store 2-1  │  Store 3-1  │  Store 5-1  │  Store 6-1  │   │
│  │  Store 2-2  │             │             │  Store 6-2  │   │
│  │         [Select All]          [Done]                   │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    activeView = 'create'                      │
│                                                              │
│  ┌─ Controls ─┐  ┌─ Form Fields ─────────────────────────┐  │
│  │ Delete     │  │  Source:      [Manual]                 │  │
│  │ & Exit     │  │  Name:        [TARGET 01]              │  │
│  │            │  │  Coordinates: [<unset>]                │  │
│  │ Create     │  │  Elevation:   [<unset>]                │  │
│  │ & Exit     │  └───────────────────────────────────────┘  │
│  │ Target     │                                              │
│  │ Update     │  OR: Full-screen KeyboardPopupComponent      │
│  └────────────┘                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    activeView = 'modify'                      │
│                                                              │
│  Same layout as 'create' but with:                           │
│  - "Modify & Exit" instead of "Create & Exit"               │
│  - Delete & Exit actually removes the target                 │
│  - Form pre-populated with existing target data              │
└──────────────────────────────────────────────────────────────┘
```

---

## View 1: Select Target List (Default)

This is the landing view. It shows all available targets in two sections.

### Cross-Cued Targets Section

The CCTGP (Cross-Cued Target Point) card is always displayed at the top. In the real system the MTS sensor feeds this target's coordinates; in the trainer it starts with placeholder data (`30N ZF 3397900000`, `0 feet [MSL-96]`).

The card has three interactive elements:

| Element                      | Behavior                                                                                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Store assignment button**  | Opens the store-assignment popup for the CCTGP. Displays assigned store IDs when stores are assigned, or "Select" when none.                                                                                                       |
| **Auto/Manual CCTGP toggle** | Cycles through three modes: `Auto` → `Manual` → `None` → `Auto`. In Auto mode, the real system updates CCTGP coordinates at 1 Hz from MTS crosshairs. In Manual mode, it updates once per button press. In None, no updates occur. |
| **Selection**                | The CCTGP card gets an animated dashed blue border when it is the selected target.                                                                                                                                                 |

### Saved Targets Section

Displays up to 3 targets at a time (controlled by `pageSize`), paginated via scroll arrows. When no targets exist, shows "No Saved Targets" in red italic text.

Each target row displays:

- Target name (bold)
- Source tag (e.g., `[Manual]`, `[TGP]`)
- Coordinates (MGRS or lat/lon string)
- Elevation with unit and reference (e.g., `1,000 Feet [MSL-84]`)

Each row has two buttons:

| Button     | First Click                                                                                        | Second Click (when already selected) |
| ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Select** | Selects the target. Shows animated dashed border. Button label changes to show assigned store IDs. | Opens the store-assignment popup.    |
| **Modify** | Opens the Modify Target view with the target's data pre-populated.                                 | —                                    |

### Scrolling

The scroll arrows (⇧ / ⇩) increment or decrement `scrollOffset` by 1. The up arrow is disabled when `scrollOffset === 0`; the down arrow is disabled when all remaining targets are visible. When a target is selected, `ensureSelectedVisible()` adjusts the scroll so the selected target is within the visible window.

### Footer

| Element                  | Behavior                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Create Target** button | Opens the Create Target view. Auto-generates a name like `TARGET 01`, `TARGET 02`, etc.                                                                            |
| **True / Mag** toggle    | Switches between true north and magnetic north heading references. Default is `True`. Per the TO, this only affects the HUD/Tracker display, not numerical inputs. |

---

## View 2: Create Target

This is a full-page form for creating a new target. It replaces the entire list view.

### Layout

The view is split into two columns:

**Left column — Control buttons:**

| Button            | Behavior                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Delete & Exit** | Guarded button (orange, rounded-bottom corners). First tap arms it (turns red). Second tap within 5 seconds discards the form and returns to the list. Any other interaction resets the guard. |
| **Create & Exit** | Disabled until the name field is populated (and not "CCTGP"). Adds the target to `savedTargets`, selects it, auto-scrolls to show it, and returns to the list.                                 |
| **Target Update** | Disabled unless source is TGP. Populates coordinates and elevation from the simulated EOIR sensor data (`SmsService.eoir`). Sets `altRef` to `MSL-96`.                                         |

**Right column — Form fields:**

| Field           | Opens                                    | Notes                                                                                                                             |
| --------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Source**      | Source chooser popup (TGP / Manual)      | When set to TGP, the Coordinates and Elevation buttons become disabled (data comes from Target Update instead).                   |
| **Name**        | On-screen keyboard in `name` mode        | Auto-populated with `TARGET XX`. The name "CCTGP" is reserved and cannot be used.                                                 |
| **Coordinates** | On-screen keyboard in `coordinates` mode | Shows the coordinate format label (MGRS/UTM/LL-DMS/LL-DDM) in the keyboard header. Disabled for TGP sources.                      |
| **Elevation**   | On-screen keyboard in `elevation` mode   | Shows elevation unit (Feet/Meters) and reference (MSL-84/HAE-84/MSL-96) toggles in the keyboard header. Disabled for TGP sources. |

Unset fields display `<unset>` in red text.

### Keyboard Integration

When any field button is tapped, the form is replaced by the shared `KeyboardPopupComponent`. The component receives:

| Input          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| `mode`         | `'coordinates'`, `'elevation'`, or `'name'`                   |
| `initialValue` | The field's current value (pre-populates the keyboard buffer) |
| `coordFormat`  | Current coordinate format (only relevant in coordinates mode) |
| `elevUnit`     | Current elevation unit (only relevant in elevation mode)      |
| `elevRef`      | Current elevation reference (only relevant in elevation mode) |

The keyboard emits:

- `(ok)` → routes the value to the appropriate `newTarget` field via `onKeyboardOk()`
- `(cancel)` → hides the keyboard, preserving the previous value
- `(coordFormatCycle)` → cycles MGRS → UTM → LL-DMS → LL-DDM
- `(elevUnitToggle)` → toggles Feet ↔ Meters
- `(elevRefCycle)` → cycles MSL-84 → HAE-84 → MSL-96

### Coordinate Format System

Four formats are supported, matching the real GSMS (Figure 1-89):

| Format    | Mask Template                      | Example                            |
| --------- | ---------------------------------- | ---------------------------------- |
| MGRS      | `__ _ __ __________ __________`    | `30N ZF 3397900000`                |
| UTM       | `__ _ ______ _______`              | `30 N 339790 0000000`              |
| DDMMSSsss | `_ __°__'__.___" _ ___°__'__.___"` | `N 34°36'00.000" W 117°40'00.000"` |
| DDMMmmmmm | `_ __°__._____ _ ___°__._____`     | `N 34°36.00000 W 117°40.00000`     |

---

## View 3: Modify Target

Structurally identical to Create Target with these differences:

| Aspect                 | Create                              | Modify                                                                                                             |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Title bar              | "Air To Ground: Create Target"      | "Air To Ground: Modify Target"                                                                                     |
| Action button          | "Create & Exit"                     | "Modify & Exit"                                                                                                    |
| Delete & Exit behavior | Discards unsaved form data          | Deletes the target from `savedTargets`, removes its store assignments, and clears the selection if it was selected |
| Form initialization    | Fresh `TARGET XX` with empty fields | Pre-populated with the target's existing data                                                                      |

### Rename Handling

When a target is renamed via Modify, the component:

1. Updates the target in the `savedTargets` array
2. Migrates the store assignments from the old name key to the new name key
3. Updates `selectedTargetName` if the renamed target was the active selection

---

## Store Assignment Popup

This overlay appears when the user taps the Select button on an already-selected target, or taps the store-assignment button on the CCTGP card.

### How It Works

1. The popup reads all stations from `SmsService.stations()` and builds an `AssignableStore[]` — one entry per substation (for M310 racks) or one per station (for single-store stations).
2. Stores are grouped by parent station into columns via `groupedStores()`.
3. Each store button toggles between assigned (blue) and unassigned (grey).
4. "Select All" assigns every available store to the target.
5. "Done" closes the popup.

### Store Label Display

The `getAssignedStoresLabel()` method builds a compact display string for each target's assigned stores:

| Scenario                              | Display                                  |
| ------------------------------------- | ---------------------------------------- |
| No stores assigned                    | `Select`                                 |
| All substations of a station assigned | `(2)` (parenthesized station number)     |
| Individual substations assigned       | `2-1, 6-2`                               |
| Mix of full stations and individuals  | `(2), 3, 6-1`                            |
| Multi-line (more than fits)           | Displayed across two lines in the button |

Store assignments are persisted via `SmsService.storeAssignments` (a `Record<string, string[]>` signal) and survive page refresh.

---

## Guarded Buttons

The real GSMS uses guarded buttons (represented with right-angled top corners and rounded bottom corners) for destructive actions. A guarded button must be pushed twice within a limited time for the action to take effect.

In this component, the "Delete & Exit" button implements this pattern:

| State   | Appearance                       | Action on Tap                                                   |
| ------- | -------------------------------- | --------------------------------------------------------------- |
| Unarmed | Orange gradient, rounded corners | Sets `deleteGuardArmed = true` (arms the guard)                 |
| Armed   | Red gradient, red border         | Executes the destructive action (delete target or discard form) |

Any other button press or navigation resets the guard via `resetDeleteGuard()`.

---

## State Management

### Persisted State (survives refresh via SmsService)

| Signal               | Where it lives | What it holds                                     |
| -------------------- | -------------- | ------------------------------------------------- |
| `savedTargets`       | `SmsService`   | The full array of user-created targets            |
| `selectedTargetName` | `SmsService`   | Which target is currently selected                |
| `storeAssignments`   | `SmsService`   | Per-target store assignment map                   |
| `stations`           | `SmsService`   | Station inventory (read-only from this component) |

### Transient State (resets on refresh — intentional)

| Property           | Default           | Why transient                                   |
| ------------------ | ----------------- | ----------------------------------------------- |
| `activeView`       | `'select'`        | User should land on the list view after refresh |
| `showStorePopup`   | `false`           | Popups should be closed                         |
| `keyboardMode`     | `'hidden'`        | Keyboard should be hidden                       |
| `keyboardBuffer`   | `''`              | Input buffer is ephemeral                       |
| `scrollOffset`     | `0`               | Minor UX — reset to top is fine                 |
| `headingRef`       | `'True'`          | Default per TO specification                    |
| `cctgpMode`        | `'Auto'`          | Default per TO specification                    |
| `coordFormat`      | `'MGRS'`          | Default per TO specification                    |
| `elevUnit`         | `'Feet'`          | Default per TO specification                    |
| `elevRef`          | `'MSL-84'`        | Default per TO specification                    |
| `newTarget`        | Empty form        | Unsaved form data is inherently transient       |
| `deleteGuardArmed` | `false`           | Security — always require re-confirmation       |
| `crossCuedTarget`  | Placeholder CCTGP | Simulated MTS data, not user-configurable       |

---

## Methods Reference

### Target Selection

| Method               | Description                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `selectTarget(name)` | If the target is already selected, opens the store popup. Otherwise, selects it and scrolls it into view. |
| `isSelected(name)`   | Returns `true` if the given name matches the currently selected target.                                   |

### Store Assignment

| Method                           | Description                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `openStorePopup(targetName)`     | Opens the store popup for the given target and selects it.                      |
| `toggleStoreAssignment(storeId)` | Adds or removes a single store from the current popup target's assignment list. |
| `selectAllStores()`              | Assigns all available stores to the current popup target.                       |
| `closeStorePopup()`              | Closes the popup overlay.                                                       |
| `hasAssignedStores(name)`        | Returns `true` if the target has at least one assigned store.                   |
| `getAssignedStoresLabel(name)`   | Builds the compact display label for a target's assigned stores.                |

### CCTGP & Heading

| Method               | Description                         |
| -------------------- | ----------------------------------- |
| `toggleCctgpMode()`  | Cycles Auto → Manual → None → Auto. |
| `toggleHeadingRef()` | Toggles True ↔ Mag.                 |

### Scrolling

| Method                    | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `scrollUp()`              | Decrements `scrollOffset` (clamped at 0).                       |
| `scrollDown()`            | Increments `scrollOffset` (clamped so last page stays visible). |
| `ensureSelectedVisible()` | Adjusts scroll so the selected target is in the visible window. |

### Create Target

| Method                | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| `openCreateTarget()`  | Initializes a new `newTarget` with auto-generated name and switches to create view.   |
| `setSource(source)`   | Sets Manual or TGP source and closes the source popup.                                |
| `openCoordKeyboard()` | Opens the keyboard in coordinates mode (blocked if source is TGP).                    |
| `openElevKeyboard()`  | Opens the keyboard in elevation mode (blocked if source is TGP).                      |
| `openNameKeyboard()`  | Opens the keyboard in name mode.                                                      |
| `createAndExit()`     | Validates, appends the target to `savedTargets`, selects it, and returns to the list. |
| `canCreateAndExit()`  | Returns `true` if the name is non-empty and not "CCTGP".                              |
| `deleteAndExit()`     | Guarded discard — first tap arms, second tap returns to list without saving.          |
| `targetUpdate()`      | Populates coordinates/elevation from simulated EOIR sensor data (TGP source only).    |

### Modify Target

| Method                   | Description                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modifyTarget(name)`     | Finds the target by name, copies its data into `newTarget`, stores the original name, and switches to modify view.                                   |
| `modifyAndExit()`        | Validates, updates the target in-place, migrates store assignments if renamed, and returns to the list.                                              |
| `canModifyAndExit()`     | Same validation as `canCreateAndExit()`.                                                                                                             |
| `guardedDeleteAndExit()` | First tap arms. Second tap deletes the target from `savedTargets`, cleans up store assignments, clears selection if needed, and returns to the list. |

### Keyboard Header Toggles

| Method                     | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `cycleCoordFormat()`       | MGRS → UTM → LL-DMS → LL-DDM → MGRS.             |
| `toggleElevUnit()`         | Feet ↔ Meters.                                   |
| `cycleElevRef()`           | MSL-84 → HAE-84 → MSL-96 → MSL-84.               |
| `openCoordSystemPopup()`   | Opens the coordinate-system chooser overlay.     |
| `selectCoordFormat(index)` | Sets the format by index and closes the chooser. |

### Keyboard Handlers

| Method                | Description                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onKeyboardOk(value)` | Routes the confirmed value to the correct `newTarget` field based on `keyboardMode`. For name mode, rejects empty strings and "CCTGP". For elevation mode, also saves the current `elevRef` as `altRef`. |
| `onKeyboardCancel()`  | Hides the keyboard without changing data.                                                                                                                                                                |

### Display Helpers

| Method                   | Description                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| `formatNumber(val)`      | Parses a string as integer and formats with commas (e.g., `"1000"` → `"1,000"`). |
| `getElevDisplay(target)` | Builds display string like `1,000 Feet [MSL-84]` for saved targets.              |
| `getCctgpElevDisplay()`  | Same format but specifically for the CCTGP card (always shows Feet).             |

---

## Computed Signals

| Signal             | Type                | Description                                                                                                                   |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `visibleTargets`   | `SavedTarget[]`     | The slice of `savedTargets` within the current scroll window (`scrollOffset` to `scrollOffset + pageSize`).                   |
| `assignableStores` | `AssignableStore[]` | All stores that can appear in the store popup, built from the current station inventory. Skips stations with no store loaded. |
| `groupedStores`    | `StoreGroup[]`      | `assignableStores` grouped by parent station ID and sorted numerically. Each group becomes a column in the popup grid.        |

---

## Visual Design

### Color Language

| Element                  | Color                 | CSS                                  |
| ------------------------ | --------------------- | ------------------------------------ |
| Section labels           | Green                 | `#00ff00`, underlined                |
| Selected target border   | Blue dashed, animated | `#4488ff` dashed, keyframe animation |
| Active/assigned buttons  | Blue gradient         | `#1a44cc → #0a1a6a`                  |
| Inactive buttons         | Grey gradient         | `#6a6a6a → #2c2c2c`                  |
| Guarded button (unarmed) | Orange gradient       | `#cc6600 → #993300`                  |
| Guarded button (armed)   | Red gradient          | `#cc2200 → #880000`                  |
| Unset field text         | Red                   | `#ff3333`                            |
| "No Saved Targets"       | Red italic            | `#ff3333`                            |
| Background               | Dark                  | `#1a1a1a` cards on transparent host  |

### Selection Animation

The selected target (CCTGP or saved) gets `border: 2px dashed #4488ff` with a CSS `@keyframes dash-march` animation that cycles the border color, creating a marching-ants effect matching the real GSMS.

---

## Related Components

| Component                  | Relationship                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `KeyboardPopupComponent`   | Shared on-screen QWERTY keyboard used for all text entry                                            |
| `SmsService`               | Central state store — provides `savedTargets`, `storeAssignments`, `selectedTargetName`, `stations` |
| `StoreSettingsComponent`   | Reads `selectedStationId` set by this page's store interactions                                     |
| `ReleaseSettingsComponent` | Uses targets selected on this page                                                                  |
| `LaunchStatusComponent`    | Displays the selected target's data in the engagement footer                                        |
| `LoadoutDisplayComponent`  | Shows station status in the header bar (affected by store power changes)                            |

---

## Known Issues / Planned Work

| Item                                                                                                                                          | Status                          |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `SavedTarget` model lacks `altUnit` field — saved targets display elevation in the global unit rather than the unit selected at creation time | Identified, not yet implemented |
| MGRS-mode key disabling in the keyboard                                                                                                       | Identified, not yet implemented |
| Right arrow key (non-functional) and left arrow key (incorrectly duplicates backspace)                                                        | Identified, not yet fixed       |
| 8-target map display limit not yet enforced                                                                                                   | Identified, not yet implemented |
| SAR target source option flagged as potentially out of scope                                                                                  | Unresolved                      |
