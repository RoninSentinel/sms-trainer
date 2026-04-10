import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SmsService, Station, ReleaseSettings } from '../../../services/sms.service';
import { NumpadPopupComponent } from '../../../components/shared/numpad-popup/numpad-popup.component';
import { DecimalPipe} from '@angular/common';

@Component({
  selector: 'app-release-settings',
  standalone: true,
  imports: [FormsModule, NumpadPopupComponent, DecimalPipe],
  templateUrl: './release-settings.component.html',
  styleUrls: ['./release-settings.component.scss'],
})
export class ReleaseSettingsComponent {
  protected readonly sms = inject(SmsService);
  protected readonly selectedStationId = this.sms.selectedStationId;

  rel!: ReleaseSettings;

  // ── Popup visibility flags ────────────────────────────────────────────────
  showLaunchModePopup = false;
  showGBUReleaseCueModePopup = false;
  activePopup: 'launchMode' | 'gbuReleaseMode' | 'gbuComplexReleaseMode' | null = null;

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

  readonly runInOptions: ReleaseSettings['runInMode'][] = ['Track', 'Manual', 'Off'];
  readonly gbuReleaseModeOptions: ReleaseSettings['gbuReleaseCueMode'][] = ['Manual', 'CCRP'];
  readonly gbuComplexReleaseModeOptions: ReleaseSettings['gbuComplexReleaseCueMode'][] = ['Manual', 'LAR'];

  // ── Computed signals ──────────────────────────────────────────────────────

  protected readonly selectedStation = computed<Station | undefined>(() =>
    this.sms.stations().find((s) => s.id === this.selectedStationId()),
  );

  protected readonly family = computed(() => {
    const st = this.selectedStation();
    return st ? this.sms.getStoreFamily(st.storeType) : 'Other';
  });

  protected readonly storeType = computed(() => {
    const st = this.selectedStation();
    return st ? st.storeType : null;
  });

  protected readonly isGbuComplex = computed(() => {
    const t = this.storeType();
    return !!t && ['GBU38', 'GBU49', 'GBU54', 'GBU48'].includes(t);
  });

  protected readonly canGoNext = computed(() => {
    const id = this.selectedStationId();
    return id !== null && this.sms.getNextStationId(id) !== null;
  });

  protected readonly canGoPrev = computed(() => {
    const id = this.selectedStationId();
    return id !== null && this.sms.getPrevStationId(id) !== null;
  });

  constructor() {
    effect(() => {
      const id = this.selectedStationId();
      this.sms.stations(); // track station changes too
      if (id !== null) {
        this.rel = { ...this.sms.getReleaseSettings(id) };
      }
    });
  }

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

  save(): void {
    const id = this.selectedStationId();
    if (id !== null) this.sms.setReleaseSettings(id, { ...this.rel });
  }

  selectRunInMode(mode: ReleaseSettings['runInMode']): void {
    this.rel.runInMode = mode;
    this.save();
    this.activePopup = null;
  }

  cycleWezMode(): void {
    this.rel.wezMode = this.rel.wezMode === 'WEZ' ? 'Manual' : 'WEZ';
    this.save();
  }

  selectGBUReleaseMode(mode: ReleaseSettings['gbuReleaseCueMode']): void {
    this.rel.gbuReleaseCueMode = mode;
    this.save();
    this.activePopup = null;
  }

  selectGbuComplexReleaseMode(mode: ReleaseSettings['gbuComplexReleaseCueMode']): void {
    this.rel.gbuComplexReleaseCueMode = mode;
    this.save();
    this.activePopup = null;
  }

  cycleTTRType(): void {
    this.rel.ttrType = this.rel.ttrType === 'DPI' ? 'Tangent' : 'DPI';
    this.save();
  }

  isCourseDisabled(): boolean {
    return this.rel.runInMode === 'Track' || this.rel.runInMode === 'Off';
  }

  isWEZMode(): boolean {
    return this.rel.wezMode === 'WEZ';
  }

  isLARMode(): boolean {
    return this.rel.gbuComplexReleaseCueMode === 'LAR';
  }

  isReleaseMode(): boolean {
    return this.rel.gbuReleaseCueMode === 'CCRP';
  }

  toggleDesiredDist(): void {
    this.rel.releaseDesiredDistToggle = this.rel.releaseDesiredDistToggle === 'Off' ? 'On' : 'Off';
    this.rel.desiredDistEnabled = this.rel.releaseDesiredDistToggle !== 'Off';
    this.save();
  }

  toggleOWTMode(): void {
    this.rel.owtMode = this.rel.owtMode === 'Off' ? 'On' : 'Off';
    this.save();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  NUMPAD — helpers to configure and show the shared NumpadPopupComponent
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Configures and opens the numpad popup.
   */
  private readonly numpadConfigs = {
    course: { title: 'Enter Run-In Course', min: 0.1, max: 360, decimal: true },
    minDist: { title: 'Enter Minimum Distance', min: 0.0, max: 25.0, decimal: true },
    desiredDist: { title: 'Enter Desired Distance', min: 0.0, max: 25.0, decimal: true },
    maxDist: { title: 'Enter Maximum Distance', min: 0.0, max: 25.0, decimal: true },
    timeOfFlight: { title: 'Enter Time of Flight', min: 0, max: 99, decimal: false },
    impactHeading: { title: 'Enter Impact Heading', min: 0, max: 360, decimal: false },
    impactRange: { title: 'Enter Impact Heading Range', min: 0, max: 180, decimal: false },
    stapleTransition: { title: 'Enter Staple Transition', min: 0.0, max: 20.0, decimal: true },
  } as const;

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

  openCourseNumpad(): void {
    const c = this.numpadConfigs.course;
    this.openNumpad(c.title, c.min, c.max, this.rel.runInCourse,
      (val) => { this.rel.runInCourse = Number(val); this.save();},
      { allowDecimal: c.decimal });
  }

  openDesiredDistanceNumpad(): void {
    const c = this.numpadConfigs.desiredDist;
    this.openNumpad(
      c.title,
      c.min,
      c.max,
      this.rel.releaseDesiredDist,
      (val) => {
        this.rel.releaseDesiredDist = Number(val);
        this.save();
      },
      { allowDecimal: c.decimal },
    );
  }

  openMinDistanceNumpad(): void {
    const c = this.numpadConfigs.minDist;
    this.openNumpad(
      c.title,
      c.min,
      c.max,
      this.rel.releaseMinDist,
      (val) => {
        this.rel.releaseMinDist = Number(val);
        this.save();
      },
      { allowDecimal: c.decimal },
    );
  }

  openMaxDistanceNumpad(): void {
    const c = this.numpadConfigs.maxDist;
    this.openNumpad(
      c.title,
      c.min,
      c.max,
      this.rel.releaseMaxDist,
      (val) => {
        this.rel.releaseMaxDist = Number(val);
        this.save();
      },
      { allowDecimal: c.decimal },
    );
  }

  openTimeOfFlightNumpad(): void {
    const c = this.numpadConfigs.timeOfFlight;
    this.openNumpad(
      c.title,
      c.min,
      c.max,
      this.rel.timeOfFlight,
      (val) => {
        this.rel.timeOfFlight = Number(val) === 0 ? 'None' : Number(val);
        this.save();
      },
      { allowDecimal: c.decimal },
    );
  }

  openImpactHeadingNumpad(): void {
    const c = this.numpadConfigs.impactHeading;
    this.openNumpad(
      c.title,
      c.min,
      c.max,
      this.rel.impactHeading,
      (val) => {
        this.rel.impactHeading = Number(val);
        this.save();
      },
      { allowDecimal: c.decimal },
    );
  }

  openImpactRangeNumpad(): void {
    const c = this.numpadConfigs.impactRange;
    this.openNumpad(
      c.title,
      c.min,
      c.max,
      this.rel.impactRange,
      (val) => {
        this.rel.impactRange = Number(val);
        this.save();
      },
      { allowDecimal: c.decimal },
    );
  }

  openStapleTransitionNumpad(): void {
    const c = this.numpadConfigs.stapleTransition;
    this.openNumpad(
      c.title,
      c.min,
      c.max,
      this.rel.stapleTransition,
      (val) => {
        this.rel.stapleTransition = Number(val);
        this.save();
      },
      { allowDecimal: c.decimal },
    );
  }

  getRippleTime(i: number): string {
    if (!this.rel) return '0.00';
    return (i * this.rel.rippleInterval).toFixed(2);
  }
}
