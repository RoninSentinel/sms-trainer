/**
 * SelectTargetComponent
 * =====================
 * This component implements the "Air To Ground: Select Target" page of the SMS trainer application.  It replicates the real GSMS
 * target-selection workflow observed in the demo video and described in
 * TO 1Q-9(M)A-34-1-1.
 *
 * The page is divided into three visual modes:
 *   1. **Select Target view** – the default list view showing Cross-Cued
 *      Targets (CCTGP) at the top and Saved Targets below.  Each target row
 *      has Select / Modify actions, scroll arrows, and a footer with
 *      "Create Target" and a "True / Mag" heading-reference toggle.
 *   2. **Create Target view** – a full-page overlay that lets the user build
 *      a new saved target by setting Source (Manual / TGP), Name,
 *      Coordinates (entered via the shared KeyboardPopupComponent with MGRS
 *      format selector), and Elevation (entered via the keyboard with
 *      Feet/Meters and MSL-84 / HAE-84 / MSL-96 reference toggles).
 *   3. **Modify Target view** – identical form to Create but pre-populated
 *      with existing target data for editing.
 *
 * Additionally, pressing the store-assignment button on a target row opens a
 * **Stores popup** where the user can assign individual weapon stations or
 * "Select All".
 *
 * The on-screen QWERTY keyboard is provided by the shared
 * KeyboardPopupComponent (src/app/components/shared/keyboard-popup/).
 *
 * The component follows the project-wide patterns:
 *   - Standalone Angular component (no NgModule)
 *   - Injects SmsService for shared state (signals-based)
 *   - Uses Angular control-flow syntax (@if, @for)
 *   - Courier New monospace font, dark military-style theme
 */

import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SmsService, SavedTarget } from '../../../services/sms.service';
import { KeyboardPopupComponent } from '../../../components/shared/keyboard-popup/keyboard-popup.component';

/** Represents a store that can be assigned to a target (e.g. "2-1", "6-2"). */
interface AssignableStore {
  id: string; // e.g. "2-1", "3", "5", "6-2"
  stationId: number; // parent station id
  label: string; // display label e.g. "Store 2-1" or "Station 3"
  assigned: boolean; // whether this store is currently assigned to the active target
}

/**
 * StoreGroup
 * Represents a single station column in the store-assignment popup.
 * Stations with substations will have multiple stores; single-store
 * stations will have exactly one entry.
 */
interface StoreGroup {
  stationId: number;
  stores: AssignableStore[];
}

@Component({
  selector: 'app-select-target',
  standalone: true,
  imports: [FormsModule, KeyboardPopupComponent],
  templateUrl: './select-target.component.html',
  styleUrls: ['./select-target.component.scss'],
})
export class SelectTargetComponent {
  // ── Injected Services ──────────────────────────────────────────────────────
  protected readonly sms = inject(SmsService);

  // ── Signals from SmsService ────────────────────────────────────────────────
  /** The full list of saved targets held in the global SMS state. */
  protected readonly targets = this.sms.savedTargets;

  /** The name of the currently selected target (shared across pages). */
  protected readonly selectedTargetName = this.sms.selectedTargetName;

  /** All weapon stations – used to build the store-assignment popup. */
  protected readonly stations = this.sms.stations;

  /** <unset> */
  readonly UNSET_LABEL = '\u003Cunset\u003E';

  // ── View State ─────────────────────────────────────────────────────────────
  /** Which high-level view is active: the target list, create form, or modify form. */
  activeView: 'select' | 'create' | 'modify' = 'select';

  /** Controls the store-assignment popup visibility. */
  showStorePopup = false;

  /** Which target name the store popup is currently assigning stores for. */
  storePopupTargetName = '';

  /** Controls the "Choose Target Source" popup inside Create Target view. */
  showSourcePopup = false;

  /** The on-screen keyboard visibility and mode. */
  keyboardMode: 'hidden' | 'coordinates' | 'elevation' | 'name' = 'hidden';

  /** Buffer holding the text to pre-populate the keyboard with. */
  keyboardBuffer = '';

  /** Scroll offset into the saved-targets list for pagination. */
  scrollOffset = 0;

  /** How many saved targets are visible at once. */
  pageSize = 3;

  /** Global heading reference toggle: 'True' (true north) or 'Mag' (magnetic). */
  headingRef: 'True' | 'Mag' = 'True';

  /** CCTGP update mode: 'Auto' continuously updates, 'Manual' updates once. */
  cctgpMode: 'Auto' | 'Manual' | 'None' = 'Auto';

  /** Coordinate format selector shown in the coordinates keyboard header. */
  coordFormat: 'MGRS' | 'UTM' | 'LL-DMS' | 'LL-DDM' = 'MGRS';

  /** Elevation unit toggle for the elevation keyboard. */
  elevUnit: 'Feet' | 'Meters' = 'Feet';

  /** Elevation reference shown in the elevation keyboard header. */
  elevRef: 'MSL-84' | 'HAE-84' | 'MSL-96' = 'MSL-84';

  // ── Choose Coordinate System Popup ───────────────────────────────
  showCoordSystemPopup = false;

  /** Coordinate format options matching Figure 1-89. */
  readonly coordFormats: { label: string; mask: string }[] = [
    { label: 'DDMMSSsss', mask: '_ __°__\'__.___" _ ___°__\'__.___"' },
    { label: 'DDMMmmmmm', mask: '_ __°__._____ _ ___°__._____' },
    { label: 'UTM', mask: '__ _ ______ _______' },
    { label: 'MGRS', mask: '__ _ __ __________ __________' },
  ];

  /** Index into coordFormats for the current selection. */
  coordFormatIndex = 3; // default MGRS

  /** The current coordinate format object (computed). */
  get currentCoordFormat(): { label: string; mask: string } {
    return this.coordFormats[this.coordFormatIndex];
  }

  /** Per-target store assignments — shared via SmsService for persistence. */
  protected readonly storeAssignments = this.sms.storeAssignments;

  // ── Create-Target Form State ───────────────────────────────────────────────
  /** Holds the data for the target currently being created or modified. */
  newTarget: SavedTarget = {
    name: '',
    lat: '',
    lon: '',
    alt: '',
    altRef: 'MSL-84',
    source: 'Manual',
  };

  // ── Modify-Target State ──────────────────────────────────────────
  /** The original name of the target being modified (for lookup). */
  modifyOriginalName = '';

  // ── Delete Guard ─────────────────────────────────────────────────
  /** Whether the delete guard is armed (first tap happened). */
  deleteGuardArmed = false;

  // ── Cross-Cued Target (CCTGP) ─────────────────────────────────────────────
  /**
   * The single cross-cued target.  In the real system this is fed by the MTS;
   * for the trainer we initialize it with placeholder coordinates.
   */
  crossCuedTarget: SavedTarget = {
    name: 'CCTGP',
    lat: '30N ZF 3397900000',
    lon: '',
    alt: '0',
    altRef: 'MSL-96',
    source: 'CCTGP',
  };

  // ── Computed Properties ────────────────────────────────────────────────────

  /**
   * visibleTargets
   * Returns the slice of saved targets that fits in the current scroll window.
   */
  protected readonly visibleTargets = computed(() => {
    return this.targets().slice(this.scrollOffset, this.scrollOffset + this.pageSize);
  });

  /**
   * assignableStores
   * Builds the list of stores that can appear in the store-assignment popup.
   */
  protected readonly assignableStores = computed<AssignableStore[]>(() => {
    const result: AssignableStore[] = [];
    const tgtName = this.storePopupTargetName;
    const assigned = this.storeAssignments()[tgtName] ?? [];

    for (const station of this.stations()) {
      if (!station.storeType) continue;

      if (station.substations && station.substations.length > 0) {
        for (const sub of station.substations) {
          result.push({
            id: sub.id,
            stationId: station.id,
            label: `Store ${sub.id}`,
            assigned: assigned.includes(sub.id),
          });
        }
      } else {
        const id = String(station.id);
        result.push({
          id,
          stationId: station.id,
          label: `Station ${station.id}`,
          assigned: assigned.includes(id),
        });
      }
    }
    return result;
  });

  /**
   * groupedStores
   * Groups assignable stores by their parent station, producing one column
   * per station.  This matches the demo layout where substores (e.g. 2-1,
   * 2-2) are stacked vertically within the same column.
   */
  protected readonly groupedStores = computed<StoreGroup[]>(() => {
    const stores = this.assignableStores();
    const groups = new Map<number, AssignableStore[]>();
    for (const store of stores) {
      if (!groups.has(store.stationId)) groups.set(store.stationId, []);
      groups.get(store.stationId)!.push(store);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([stationId, storeList]) => ({ stationId, stores: storeList }));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  TARGET SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * selectTarget
   * Toggles the selection of a target by name.  If the target is already
   * selected it opens the store popup; otherwise it becomes the
   * active target and ensures it is scrolled into view.
   */
  selectTarget(name: string): void {
    if (this.selectedTargetName() === name) {
      this.openStorePopup(name);
      return;
    }
    this.sms.selectedTargetName.set(name);
    this.ensureSelectedVisible();
  }

  /** Returns true if the given name matches the currently selected target. */
  isSelected(name: string): boolean {
    return this.selectedTargetName() === name;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  STORE ASSIGNMENT POPUP
  // ═══════════════════════════════════════════════════════════════════════════

  /** Opens the store-assignment popup for the given target. */
  openStorePopup(targetName: string): void {
    this.storePopupTargetName = targetName;
    this.showStorePopup = true;
    this.sms.selectedTargetName.set(targetName);
  }

  /** Toggles a single store's assignment for the current popup target. */
  toggleStoreAssignment(storeId: string): void {
    const tgt = this.storePopupTargetName;
    this.storeAssignments.update((map) => {
      const list = [...(map[tgt] ?? [])];
      const idx = list.indexOf(storeId);
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        list.push(storeId);
      }
      return { ...map, [tgt]: list };
    });
  }

  /** Assigns all available stores to the current popup target. */
  selectAllStores(): void {
    const tgt = this.storePopupTargetName;
    const allIds = this.assignableStores().map((s) => s.id);
    this.storeAssignments.update((map) => ({ ...map, [tgt]: allIds }));
  }

  /** Closes the store-assignment popup. */
  closeStorePopup(): void {
    this.showStorePopup = false;
  }

  /** Returns true if the given target has at least one store assigned. */
  hasAssignedStores(targetName: string): boolean {
    const assigned = this.storeAssignments()[targetName];
    return !!assigned && assigned.length > 0;
  }

  /**
   * getAssignedStoresLabel
   * Builds the display label for a target's assigned stores.
   */
  getAssignedStoresLabel(targetName: string): string {
    const assigned = this.storeAssignments()[targetName] ?? [];
    if (assigned.length === 0) return 'Select';

    const stationMap = new Map<number, string[]>();
    for (const id of assigned) {
      const parts = id.split('-');
      const stNum = parseInt(parts[0], 10);
      if (!stationMap.has(stNum)) stationMap.set(stNum, []);
      stationMap.get(stNum)!.push(id);
    }

    const labels: string[] = [];
    const sortedStations = [...stationMap.keys()].sort((a, b) => a - b);
    for (const stNum of sortedStations) {
      const ids = stationMap.get(stNum)!;
      const station = this.stations().find((s) => s.id === stNum);
      if (station?.substations && station.substations.length > 0) {
        const allSubIds = station.substations.map((sub) => sub.id);
        const allAssigned = allSubIds.every((sub) => ids.includes(sub));
        if (allAssigned) {
          labels.push(`(${stNum})`);
        } else {
          labels.push(...ids);
        }
      } else {
        labels.push(String(stNum));
      }
    }
    return labels.join(', ');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CCTGP MODE & HEADING
  // ═══════════════════════════════════════════════════════════════════════════

  /** Cycles the CCTGP mode: Auto → Manual → None → Auto. */
  toggleCctgpMode(): void {
    if (this.cctgpMode === 'Auto') {
      this.cctgpMode = 'Manual';
    } else if (this.cctgpMode === 'Manual') {
      this.cctgpMode = 'None';
    } else {
      this.cctgpMode = 'Auto';
    }
  }

  /** Toggles heading reference between True and Mag. */
  toggleHeadingRef(): void {
    this.headingRef = this.headingRef === 'True' ? 'Mag' : 'True';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SCROLLING
  // ═══════════════════════════════════════════════════════════════════════════

  scrollUp(): void {
    if (this.scrollOffset > 0) this.scrollOffset--;
  }

  scrollDown(): void {
    if (this.scrollOffset < this.targets().length - this.pageSize) {
      this.scrollOffset++;
    }
  }

  ensureSelectedVisible(): void {
    const name = this.selectedTargetName();
    const idx = this.targets().findIndex((t) => t.name === name);
    if (idx < 0) return;
    if (idx < this.scrollOffset) {
      this.scrollOffset = idx;
    } else if (idx >= this.scrollOffset + this.pageSize) {
      this.scrollOffset = idx - this.pageSize + 1;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CREATE TARGET
  // ═══════════════════════════════════════════════════════════════════════════

  openCreateTarget(): void {
    const nextNum = this.targets().length + 1;
    const paddedNum = String(nextNum).padStart(2, '0');
    this.newTarget = {
      name: `TARGET ${paddedNum}`,
      lat: '',
      lon: '',
      alt: '',
      altRef: 'MSL-84',
      source: 'Manual',
    };
    this.activeView = 'create';
    this.keyboardMode = 'hidden';
    this.showSourcePopup = false;
    this.deleteGuardArmed = false;
  }

  setSource(source: 'Manual' | 'TGP'): void {
    this.newTarget.source = source;
    this.showSourcePopup = false;
  }

  // ── Keyboard Openers ──────────────────────────────────────────────────────

  openCoordKeyboard(): void {
    if (this.newTarget.source === 'TGP') return;
    this.keyboardBuffer = this.newTarget.lat || '';
    this.keyboardMode = 'coordinates';
  }

  openElevKeyboard(): void {
    if (this.newTarget.source === 'TGP') return;
    this.keyboardBuffer = this.newTarget.alt || '';
    this.keyboardMode = 'elevation';
  }

  openNameKeyboard(): void {
    this.keyboardBuffer = this.newTarget.name || '';
    this.keyboardMode = 'name';
  }

  // ── Keyboard Header Toggles ────────────────────────────────────────────────

  cycleCoordFormat(): void {
    const formats: (typeof this.coordFormat)[] = ['MGRS', 'UTM', 'LL-DMS', 'LL-DDM'];
    const i = formats.indexOf(this.coordFormat);
    this.coordFormat = formats[(i + 1) % formats.length];
  }

  toggleElevUnit(): void {
    this.elevUnit = this.elevUnit === 'Feet' ? 'Meters' : 'Feet';
  }

  cycleElevRef(): void {
    const refs: (typeof this.elevRef)[] = ['MSL-84', 'HAE-84', 'MSL-96'];
    const i = refs.indexOf(this.elevRef);
    this.elevRef = refs[(i + 1) % refs.length];
  }

  // ── Choose Coordinate System Popup ───────────────────────────────

  openCoordSystemPopup(): void {
    this.showCoordSystemPopup = true;
  }

  selectCoordFormat(index: number): void {
    this.coordFormatIndex = index;
    this.showCoordSystemPopup = false;
  }

  // ── Shared Keyboard Handlers ───────────────────────────────────────────────

  /**
   * onKeyboardOk
   * Called when the shared KeyboardPopupComponent emits a confirmed value.
   * Routes the value to the appropriate field based on current keyboard mode.
   */
  onKeyboardOk(value: string): void {
    if (this.keyboardMode === 'coordinates') {
      this.newTarget.lat = value;
    } else if (this.keyboardMode === 'elevation') {
      this.newTarget.alt = value;
      this.newTarget.altRef = this.elevRef;
    } else if (this.keyboardMode === 'name') {
      if (value.trim().toUpperCase() !== 'CCTGP' && value.trim() !== '') {
        this.newTarget.name = value.trim();
      }
    }
    this.showCoordSystemPopup = false;
    this.keyboardMode = 'hidden';
  }

  onKeyboardCancel(): void {
    this.keyboardMode = 'hidden';
  }

  targetUpdate(): void {
    if (this.newTarget.source === 'TGP') {
      this.newTarget.lat = this.sms.eoir?.lat ?? 'N 0°00\'00.000"';
      this.newTarget.alt = String(this.sms.eoir?.alt ?? 0);
      this.newTarget.altRef = 'MSL-96';
    }
  }

  // ── Create / Delete Actions ────────────────────────────────────────────────

  createAndExit(): void {
    const name = this.newTarget.name.trim();
    if (!name || name.toUpperCase() === 'CCTGP') return;

    const elevDisplay = this.newTarget.alt ? `${this.newTarget.alt}` : '0';

    const target: SavedTarget = {
      name,
      lat: this.newTarget.lat || '<unset>',
      lon: this.newTarget.lon || '',
      alt: elevDisplay,
      altRef: this.newTarget.altRef || 'MSL-84',
      source: this.newTarget.source as SavedTarget['source'],
    };

    this.sms.savedTargets.update((list) => [...list, target]);
    this.sms.selectedTargetName.set(name);

    const newLen = this.targets().length;
    if (newLen > this.pageSize) {
      this.scrollOffset = newLen - this.pageSize;
    }

    this.activeView = 'select';
    this.keyboardMode = 'hidden';
  }

  canCreateAndExit(): boolean {
    const name = this.newTarget.name.trim();
    return !!name && name.toUpperCase() !== 'CCTGP';
  }

  deleteAndExit(): void {
    if (!this.deleteGuardArmed) {
      this.deleteGuardArmed = true;
      return;
    }
    this.deleteGuardArmed = false;
    this.activeView = 'select';
    this.keyboardMode = 'hidden';
  }

  resetDeleteGuard(): void {
    this.deleteGuardArmed = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MODIFY TARGET
  // ═══════════════════════════════════════════════════════════════════════════

  modifyTarget(name: string): void {
    const target = this.targets().find((t) => t.name === name);
    if (!target) return;

    this.modifyOriginalName = name;
    this.newTarget = { ...target };
    this.elevRef = (target.altRef as typeof this.elevRef) || 'MSL-84';
    this.activeView = 'modify';
    this.keyboardMode = 'hidden';
    this.deleteGuardArmed = false;
  }

  modifyAndExit(): void {
    const name = this.newTarget.name.trim();
    if (!name || name.toUpperCase() === 'CCTGP') return;

    const elevDisplay = this.newTarget.alt ? `${this.newTarget.alt}` : '0';

    this.sms.savedTargets.update((list) =>
      list.map((t) =>
        t.name === this.modifyOriginalName
          ? {
              ...this.newTarget,
              name,
              alt: elevDisplay,
              altRef: this.newTarget.altRef || 'MSL-84',
            }
          : t,
      ),
    );

    if (name !== this.modifyOriginalName) {
      this.storeAssignments.update((map) => {
        const assignments = map[this.modifyOriginalName];
        if (assignments) {
          const { [this.modifyOriginalName]: _, ...rest } = map;
          return { ...rest, [name]: assignments };
        }
        return map;
      });

      if (this.selectedTargetName() === this.modifyOriginalName) {
        this.sms.selectedTargetName.set(name);
      }
    }

    this.activeView = 'select';
    this.keyboardMode = 'hidden';
  }

  canModifyAndExit(): boolean {
    const name = this.newTarget.name.trim();
    return !!name && name.toUpperCase() !== 'CCTGP';
  }

  guardedDeleteAndExit(): void {
    if (!this.deleteGuardArmed) {
      this.deleteGuardArmed = true;
      return;
    }

    const name = this.modifyOriginalName;

    this.sms.savedTargets.update((list) => list.filter((t) => t.name !== name));

    this.storeAssignments.update((map) => {
      const { [name]: _, ...rest } = map;
      return rest;
    });

    if (this.selectedTargetName() === name) {
      this.sms.selectedTargetName.set('');
    }

    this.deleteGuardArmed = false;
    this.activeView = 'select';
    this.keyboardMode = 'hidden';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DISPLAY HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  formatNumber(val: string): string {
    const num = parseInt(val, 10);
    if (isNaN(num)) return val;
    return num.toLocaleString('en-US');
  }

  getElevDisplay(target: SavedTarget): string {
    const val = this.formatNumber(target.alt || '0');
    const unit = this.elevUnit;
    return `${val} ${unit} [${target.altRef}]`;
  }

  getCctgpElevDisplay(): string {
    const val = this.formatNumber(this.crossCuedTarget.alt || '0');
    return `${val} Feet [${this.crossCuedTarget.altRef}]`;
  }
}
