# LoadoutDisplayComponent

The horizontal "LOADOUT DISPLAY" strip that mirrors the top-of-screen loadout summary on the real SMS unit. Renders all seven aircraft stations side-by-side, showing each station's munition image, power state, and store status. Clicking a station selects it as the active station for the rest of the Air-Ground UI.

## Selector

```html
<app-loadout-display>
```

This is a standalone component with no inputs or outputs — all state is read from and written to [SmsService](../../../services/sms.service.ts).

## Layout

Each station is rendered as a `.station-column` containing:

1. **`.station-box`** — the bordered tile, containing only:
   - The "Station N" label.
   - The weapon icon (`<img>`) when a store is loaded, or a blank placeholder when empty.
2. **`.status-stack`** — status rows rendered *below* the bordered box:
   - For single-store stations: one `.store-info-box` with a power square + status text (e.g. `IDLE`, `READY`).
   - For multi-store racks (Hellfire / M310 launcher): one `.sub-info-box` per substation, each showing power square + status text + the substation's munition type (e.g. `Hellfire`, `AWM`).

This split — image inside the box, status below — replicates the layout of the real SMS unit, where the bordered tile holds only the silhouette and the rails of status indicators sit beneath it.

### Selected station

When a station's id matches `SmsService.selectedStationId`, the `.station-column` gets a `.selected` class which applies a dashed cyan border (`#00bcd4`) to the inner `.station-box`.

## Data source

The component reads two signals from [SmsService](../../../services/sms.service.ts):

| Signal | Type | Purpose |
|--------|------|---------|
| `stations` | `Signal<Station[]>` | The seven aircraft stations and their loadouts. |
| `selectedStationId` | `WritableSignal<number>` | The currently selected station; written on click. |

The relevant fields on each [`Station`](../../../services/sms.service.ts) are:

- `id` — used for the "Station N" label and the selection key.
- `storeType` — drives icon lookup; empty string means no store loaded.
- `storeStatus`, `storePower` — drive the single-store status row.
- `substations?` — when present (Hellfire/M310 racks), drives the substation rows instead of a single status row.

## Weapon icon mapping

Icon paths are held in a private `STORE_ICONS` map at the top of [loadout-display.component.ts](./loadout-display.component.ts):

| StoreType | Icon |
|-----------|------|
| `GBU12`, `GBU38`, `GBU48`, `GBU49`, `GBU54` | `assets/weapon-icons/GBU.png` |
| `Hellfire` | `assets/weapon-icons/hellfire.png` |
| any other (e.g. `AWM`, `M36`) | falls back to text label |

Icon size defaults to the base `.store-icon-img` rule in [loadout-display.component.scss](./loadout-display.component.scss). `getStoreFamily()` adds a `family-{gbu|hellfire|other}` class so individual families can override the defaults; currently only `.family-hellfire` does (slightly smaller to account for its wider silhouette).

> **Note:** This mapping is currently duplicated in [select-store.component.ts](../../../pages/air-ground/select-store/select-store.component.ts). If a third consumer is added, hoist it into `SmsService` as a single source of truth.

## Status colors

Status text color is driven by `SmsService.getStatusClass(status)`, which returns one of `status-yellow`, `status-red`, `status-green`, `status-black`. Those classes are defined in global styles, not in this component's scss.

## Usage

```html
<app-loadout-display></app-loadout-display>
```

Drop it at the top of any screen that should show the loadout summary. It pulls all of its state from `SmsService`, so no bindings are required and any updates to station state (selecting a store, powering on, BIT sequence, etc.) automatically reflect in the display.

### Importing

```typescript
import { LoadoutDisplayComponent } from '@components/shared/loadout-display/loadout-display.component';

@Component({
  imports: [LoadoutDisplayComponent],
  // ...
})
export class MyComponent {}
```

## Accessibility

- Each `.station-column` is `tabindex="0"` with `role="button"`.
- Both click and `Enter` key trigger station selection via `selectStation()`.
