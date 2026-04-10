/**
 * StoreSettingsComponent
 * ======================
 * This component renders the "Air To Ground: Store Settings" page for the SMS
 * trainer application.  It dynamically adapts its layout and available controls
 * based on the weapon variant currently loaded on the selected station.
 *
 * All numeric input fields open the shared NumpadPopupComponent instead of
 * free-form keyboard entry, matching the real software's keypad behavior
 * (Figure 1-51).
 *
 * Follows the project's standalone-component pattern with FormsModule for
 * template-driven two-way binding (ngModel).
 */

import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SmsService, Station, GbuSettings, HellfireSettings } from '../../../services/sms.service';
import { NumpadPopupComponent } from '../../../components/shared/numpad-popup/numpad-popup.component';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [FormsModule, NumpadPopupComponent],
  templateUrl: './store-settings.component.html',
  styleUrls: ['./store-settings.component.scss'],
})
export class StoreSettingsComponent {
  protected readonly sms = inject(SmsService);
  protected readonly selectedStationId = this.sms.selectedStationId;

  // ── Local mutable copies of per-station settings ──────────────────────────

  gbu!: GbuSettings;
  hf!: HellfireSettings;

  // ── Hellfire-specific local state ─────────────────────────────────────────

  hfSubStationIdx = signal(0);

  // ── GBU-12 fuze arming state ──────────────────────────────────────────────

  gbuFuzeArmSelections = new Set<string>();
  gbuFuzeArmLabel = 'None';

  // ── Popup visibility flags ────────────────────────────────────────────────

  showLaunchModePopup = false;
  showFuzeFunctionPopup = false;
  showTmPowerPopup = false;
  showFuzeArmPopup = false;

  // ── Numpad popup configuration ────────────────────────────────────────────
  // The shared NumpadPopupComponent is shown/hidden via `showNumpad`.
  // Configuration inputs are set by the field-specific opener methods below.

  showNumpad = false;
  numpadTitle = '';
  numpadMin = 0;
  numpadMax = 9999;
  numpadCurrentValue: string | number = '';
  numpadAllowNegative = false;
  numpadAllowDecimal = false;

  /** Callback invoked when the numpad emits a confirmed value. */
  private numpadOnConfirm: ((value: string) => void) | null = null;

  // ── Static option lists ───────────────────────────────────────────────────

  readonly launchModeOptions: HellfireSettings['launchMode'][] = ['Direct', 'High', 'Low'];

  readonly fuzeFunctionOptions: string[] = [
    'PRF',
    'INST',
    'AB',
    '3.5 ms',
    '6.9 ms',
    '10 ms',
    '20 ms',
    '30 ms',
    '40 ms',
    '60 ms',
    '80 ms',
    '120 ms',
    '150 ms',
    'Spare 1',
    'Spare 2',
    'Spare 3',
  ];

  readonly fuzeArmPositions: string[] = ['Nose', 'Center', 'Tail'];

  // ── Computed signals ──────────────────────────────────────────────────────

  protected readonly selectedStation = computed<Station | undefined>(() =>
    this.sms.stations().find((s) => s.id === this.selectedStationId()),
  );

  protected readonly storeVariant = computed<'Hellfire' | 'GBU12' | 'GBU-Complex' | 'Other'>(() => {
    const st = this.selectedStation();
    if (!st) return 'Other';
    const family = this.sms.getStoreFamily(st.storeType);
    if (family === 'Hellfire') return 'Hellfire';
    if (st.storeType === 'GBU12') return 'GBU12';
    if (['GBU38', 'GBU49', 'GBU54', 'GBU48'].includes(st.storeType)) return 'GBU-Complex';
    return 'Other';
  });

  protected readonly canGoNext = computed<boolean>(() => {
    const id = this.selectedStationId();
    return id !== null && this.sms.getNextStationId(id) !== null;
  });

  protected readonly canGoPrev = computed<boolean>(() => {
    const id = this.selectedStationId();
    return id !== null && this.sms.getPrevStationId(id) !== null;
  });

  protected readonly stationLabel = computed<string>(() => {
    const st = this.selectedStation();
    if (!st) return '--';
    if (st.substations && st.substations.length > 0) {
      const subId = st.substations[this.hfSubStationIdx()]?.id ?? st.id;
      return 'Station ' + subId;
    }
    return 'Station ' + st.id;
  });

  protected readonly hasSubStations = computed<boolean>(() => {
    const st = this.selectedStation();
    return !!(st?.substations && st.substations.length > 1);
  });

  protected readonly segInfo = computed<string | null>(() => {
    const st = this.selectedStation();
    if (!st) return null;
    const total = this.sms.stations().filter((s) => s.storeType === st.storeType).length;
    if (total <= 1) return null;
    const idx =
      this.sms
        .stations()
        .filter((s) => s.storeType === st.storeType)
        .findIndex((s) => s.id === this.selectedStationId()) + 1;
    return idx + '/' + total;
  });

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor() {
    effect(() => {
      const id = this.selectedStationId();
      this.sms.stations();
      if (id !== null) {
        this.gbu = { ...this.sms.getGbuSettings(id) };
        this.hf = { ...this.sms.getHellfireSettings(id) };
        this.hfSubStationIdx.set(0);

        // Restore fuze arm selections from persisted positions
        this.gbuFuzeArmSelections = new Set<string>(this.gbu.fuzeArmPositions);
        this.updateFuzeArmLabel();
      }
    });
  }

  // ── Station navigation ────────────────────────────────────────────────────

  nextStation(): void {
    const id = this.selectedStationId();
    if (id === null) return;
    const next = this.sms.getNextStationId(id);
    if (next !== null) this.sms.selectedStationId.set(next);
  }

  prevStation(): void {
    const id = this.selectedStationId();
    if (id === null) return;
    const prev = this.sms.getPrevStationId(id);
    if (prev !== null) this.sms.selectedStationId.set(prev);
  }

  nextSubStation(): void {
    const st = this.selectedStation();
    if (st?.substations && this.hfSubStationIdx() < st.substations.length - 1) {
      this.hfSubStationIdx.update((i) => i + 1);
    }
  }

  prevSubStation(): void {
    if (this.hfSubStationIdx() > 0) {
      this.hfSubStationIdx.update((i) => i - 1);
    }
  }

  // ── Settings persistence helpers ──────────────────────────────────────────

  saveGbu(): void {
    const id = this.selectedStationId();
    if (id !== null) this.sms.setGbuSettings(id, { ...this.gbu });
  }

  saveHf(): void {
    const id = this.selectedStationId();
    if (id !== null) this.sms.setHellfireSettings(id, { ...this.hf });
  }

  // ── Hellfire interaction handlers ─────────────────────────────────────────

  selectLaunchMode(mode: HellfireSettings['launchMode']): void {
    this.hf.launchMode = mode;
    this.saveHf();
    this.showLaunchModePopup = false;
  }

  selectFuzeFunction(fn: string): void {
    this.hf.fuzeFunction = fn;
    this.saveHf();
    this.showFuzeFunctionPopup = false;
  }

  selectTmPower(val: 'On' | 'Off'): void {
    this.hf.tmPower = val === 'On';
    this.saveHf();
    this.showTmPowerPopup = false;
  }

  // ── GBU-12 interaction handlers ───────────────────────────────────────────

  toggleFuzeArmPosition(pos: string): void {
    if (this.gbuFuzeArmSelections.has(pos)) {
      this.gbuFuzeArmSelections.delete(pos);
    } else {
      this.gbuFuzeArmSelections.add(pos);
    }
    this.gbu.fuzeArmPositions = Array.from(this.gbuFuzeArmSelections);
    this.updateFuzeArmLabel();
  }

  isFuzeArmSelected(pos: string): boolean {
    return this.gbuFuzeArmSelections.has(pos);
  }

  doneFuzeArm(): void {
    this.showFuzeArmPopup = false;
    if (this.gbuFuzeArmSelections.size > 0) {
      this.gbu.fuzeArm = 'ARM';
    } else {
      this.gbu.fuzeArm = 'SAFE';
    }
    this.saveGbu();
  }

  // ── GBU-Complex interaction handlers ─────────────────────────────────────

  toggleImpactAngle(): void {
    this.gbu.impactAngleEnabled = !this.gbu.impactAngleEnabled;
    this.saveGbu();
  }

  toggleImpactAzimuth(): void {
    this.gbu.impactAzimuthEnabled = !this.gbu.impactAzimuthEnabled;
    this.saveGbu();
  }

  applyToType(): void {
    const id = this.selectedStationId();
    const st = this.selectedStation();
    if (!id || !st) return;

    const variant = this.storeVariant();
    const matchingStations = this.sms.stations().filter((s) => s.storeType === st.storeType && s.id !== id);

    for (const target of matchingStations) {
      if (variant === 'GBU12' || variant === 'GBU-Complex') {
        this.sms.setGbuSettings(target.id, { ...this.gbu });
      } else if (variant === 'Hellfire') {
        this.sms.setHellfireSettings(target.id, { ...this.hf });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  NUMPAD — helpers to configure and show the shared NumpadPopupComponent
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Configures and opens the numpad popup.
   */
  openNumpad(
    title: string,
    min: number,
    max: number,
    current: string | number,
    onConfirm: (value: string) => void,
    opts?: { allowNegative?: boolean; allowDecimal?: boolean },
  ): void {
    this.numpadTitle = title;
    this.numpadMin = min;
    this.numpadMax = max;
    this.numpadCurrentValue = current;
    this.numpadAllowNegative = opts?.allowNegative ?? false;
    this.numpadAllowDecimal = opts?.allowDecimal ?? false;
    this.numpadOnConfirm = onConfirm;
    this.showNumpad = true;
  }

  /** Called when the numpad emits a confirmed value. */
  onNumpadConfirm(value: string): void {
    if (this.numpadOnConfirm) {
      this.numpadOnConfirm(value);
    }
    this.showNumpad = false;
  }

  /** Called when the numpad emits a cancel. */
  onNumpadCancel(): void {
    this.showNumpad = false;
  }

  // ── Field-specific numpad openers ─────────────────────────────────────────

  openHfPrfNumpad(): void {
    this.openNumpad('Enter PRF Code', 1111, 1788, this.hf.laserCode, (val) => {
      this.hf.laserCode = val;
      this.saveHf();
    });
  }

  openGbuPrfNumpad(): void {
    this.openNumpad('Enter PRF Code', 1511, 1788, this.gbu.prf, (val) => {
      this.gbu.prf = val;
      this.saveGbu();
    });
  }

  openOffsetNorthNumpad(): void {
    this.openNumpad(
      'Enter Offset North',
      -100,
      100,
      this.gbu.offsetN,
      (val) => {
        this.gbu.offsetN = parseFloat(val);
        this.saveGbu();
      },
      { allowNegative: true },
    );
  }

  openOffsetEastNumpad(): void {
    this.openNumpad(
      'Enter Offset East',
      -100,
      100,
      this.gbu.offsetE,
      (val) => {
        this.gbu.offsetE = parseFloat(val);
        this.saveGbu();
      },
      { allowNegative: true },
    );
  }

  openOffsetDownNumpad(): void {
    this.openNumpad(
      'Enter Offset Down',
      -100,
      100,
      this.gbu.offsetD,
      (val) => {
        this.gbu.offsetD = parseFloat(val);
        this.saveGbu();
      },
      { allowNegative: true },
    );
  }

  openImpactAngleNumpad(): void {
    this.openNumpad('Enter Impact Angle', 20, 90, this.gbu.impactAngle, (val) => {
      this.gbu.impactAngle = parseFloat(val);
      this.saveGbu();
    });
  }

  openImpactAzimuthNumpad(): void {
    this.openNumpad('Enter Impact Azimuth', 0, 360, this.gbu.impactAzimuth, (val) => {
      this.gbu.impactAzimuth = parseFloat(val);
      this.saveGbu();
    });
  }

  openFunctionDelayNumpad(): void {
    this.openNumpad('Enter Function Delay', 0, 999, this.gbu.functionDelay, (val) => {
      this.gbu.functionDelay = parseFloat(val);
      this.saveGbu();
    });
  }

  openArmDelayNumpad(): void {
    this.openNumpad(
      'Enter Arm Delay',
      0,
      99.9,
      this.gbu.armDelay,
      (val) => {
        this.gbu.armDelay = parseFloat(val);
        this.saveGbu();
      },
      { allowDecimal: true },
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private updateFuzeArmLabel(): void {
    if (this.gbuFuzeArmSelections.size === 0) {
      this.gbuFuzeArmLabel = 'None';
    } else {
      this.gbuFuzeArmLabel = Array.from(this.gbuFuzeArmSelections).join(' + ');
    }
  }
}
