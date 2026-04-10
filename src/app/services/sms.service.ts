/**
 * sms.service.ts
 * ==============
 * Central state-management service for the SMS (Stores Management System)
 * trainer application.  This injectable singleton holds all shared reactive
 * state using Angular signals, including:
 *
 *   - Station / substation inventory and power state
 *   - Link (LNK) and status (STS) indicator states
 *   - Per-station weapon settings (GBU, Hellfire)
 *   - Per-station release settings
 *   - Saved targets list and currently selected target
 *   - Per-target store assignments
 *   - Pilot profiles
 *   - Warnings / cautions
 *
 * Other components inject this service via Angular DI and read/write signals
 * to coordinate state across the Air-Ground workflow pages (Select Store,
 * Store Settings, Select Target, Release Settings, Launch Status).
 *
 * STATE PERSISTENCE
 * -----------------
 * All writable signals are automatically persisted to localStorage via the
 * StatePersistenceService.  On construction, the service attempts to hydrate
 * from a saved snapshot.  A single `effect()` watches every persistable
 * signal and writes a new snapshot on any change.  This means components
 * never need to manually trigger a save — it happens reactively.
 *
 * To reset all state to factory defaults and clear localStorage, call
 * `resetToDefaults()`.
 *
 */
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { StatePersistenceService, StateSnapshot } from './state-persistence.service';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * StoreStatus — all possible weapon-store status values.
 * Determines the color of the store-status indicator LED.
 */
export type StoreStatus =
  | 'UNVRFD'
  | 'INVLD'
  | 'REL'
  | 'AWAY'
  | 'WARN'
  | 'ERROR'
  | 'BIT'
  | 'FAILED'
  | 'READY'
  | 'IDLE'
  | 'HUNG'
  | 'JETTED'
  | 'JET'
  | 'MINREL'
  | 'DEGRD'
  | 'AUR'
  | 'IBIT'
  | 'WARMUP'
  | '';

/**
 * StoreType — the weapon type loaded on a station or substation.
 * Empty string means the station has no store loaded.
 */
export type StoreType = 'GBU12' | 'GBU38' | 'GBU49' | 'GBU54' | 'GBU48' | 'Hellfire' | 'M36' | 'AWM' | '';

/**
 * LauncherType — the physical launcher rack mounted on a station.
 *   M310 — dual-rail (2 Hellfire positions)
 *   M299 — quad-rail (4 Hellfire positions)
 */
export type LauncherType = 'M310' | 'M299';

/**
 * SubStation — represents a single munition position on a multi-store
 * launcher (e.g. position 2-1 or 2-2 on a Hellfire M310 rack, or
 * 2-1 through 2-4 on an M299 quad-rail).
 */
export interface SubStation {
  id: string;
  storeType: StoreType;
  storeStatus: StoreStatus;
  storePower: boolean;
  selected: boolean;
}

/**
 * Station — represents one of the seven physical weapon stations
 * on the aircraft (Stations 2, 3, 5, 6; Station 4 is reserved and
 * Station 1/7 do not hold weapons).
 */
export interface Station {
  id: number;
  label: string;
  loadable: boolean;
  storeType: StoreType;
  storeStatus: StoreStatus;
  storePower: boolean;
  selected: boolean;
  substations?: SubStation[];
  launcher?: LauncherType;
  isTrainer?: boolean;
}

/** LinkState — link indicator states (data-link to aircraft). */
export type LinkState = 'RED' | 'BLINK_YELLOW' | 'GREEN' | 'BLINK_GREEN';

/** StsState — system status indicator states. */
export type StsState = 'RED' | 'BLINK_RED' | 'YELLOW' | 'BLINK_YELLOW' | 'GREEN';

/**
 * GbuSettings — per-station settings for GBU-series laser-guided bombs.
 * Includes PRF code, fuze configuration, impact angle, and target offsets.
 */
export interface GbuSettings {
  prf: string;
  laserReceiver: boolean;
  impactAngle: number;
  impactAngleEnabled: boolean;
  impactAzimuth: number;
  impactAzimuthEnabled: boolean;
  functionDelay: number;
  armDelay: number;
  offsetN: number;
  offsetE: number;
  offsetD: number;
  fuzeArm: 'SAFE' | 'ARM';
  fuzeArmPositions: string[];
  fuzingType: 'NOSE' | 'TAIL' | 'NOSE/TAIL';
  guidanceMode: 'LGB' | 'GPS' | 'INS';
}


/**
 * HellfireSettings — per-station settings for AGM-114 Hellfire missiles.
 * Includes seeker mode (LOAL/LOBL), launch trajectory, laser code, etc.
 */
export interface HellfireSettings {
  laserCode: string;
  seekerMode: 'LOAL' | 'LOBL';
  launchMode: 'Direct' | 'High' | 'Low' | 'LOBL';
  tmPower: boolean;
  fuzeFunction: string;
  laserSpotTracker: boolean;
  warheadType: 'K-HEAT' | 'BLAST-FRAG' | 'THERMOBARIC';
  rocketMotor: 'AGM-114K' | 'AGM-114R' | 'AGM-114N';
  salvoPulse: number;
}

/**
 * ReleaseSettings — per-station release / tactical settings.
 * Controls ripple parameters, run-in course, WEZ, release mode, etc.
 */
export interface ReleaseSettings {
  //General:
  runInMode: 'Track' | 'Manual' | 'Off';
  runInCourse: number;
  ttrType: 'Tangent' | 'DPI';
  isCourseDisabled: boolean;
  //Hellfire Settings:
  wezMode: 'WEZ' | 'Manual';
  rippleCount: number;
  rippleInterval: number;
  releaseOrder: string[];
  targetType: 'Stationary' | 'Moving';
  rtiAzimuth: number;
  releaseDesiredDistToggle: 'Off' | 'On';
  desiredDistEnabled: boolean;
  releaseMinDist: number;
  releaseDesiredDist: number;
  releaseMaxDist: number;
  timeOfFlight: number | 'None';
  impactHeading: 'Off' | number;
  impactRange: number;
  stapleTransition: number;
  gbuReleaseCueMode: 'Manual' | 'CCRP';
  gbuComplexReleaseCueMode: 'LAR' | 'Manual';
  owtMode: 'Off' | 'On';
}

/**
 * SavedTarget — a target in the saved targets list.
 *
 * Each target has a name, lat/lon coordinates, altitude, altitude reference,
 * and a source indicating how the target was created.
 *
 * The altRef field supports the three GSMS elevation reference datums
 * documented in TO 1Q-9(M)A-34-1-1:
 *   - 'MSL-84' : Mean Sea Level using WGS 84/10 (EGM84) geoid
 *   - 'HAE-84' : Height Above Ellipsoid using WGS-84 ellipsoid
 *   - 'MSL-96' : Mean Sea Level using EGM-96 geoid (CCTGP default)
 *
 * Legacy values 'MSL' and 'AGL' are retained for backward compatibility.
 */
export interface SavedTarget {
  name: string;
  lat: string;
  lon: string;
  alt: string;
  altRef: 'MSL-84' | 'HAE-84' | 'MSL-96' | 'MSL' | 'AGL';
  source: 'Manual' | 'Nav' | 'TGP' | 'SADL' | 'CCTGP';
}

/**
 * Profile — a weapon employment profile for quick-switching configurations.
 * Up to 8 profiles can be stored; only one is active at a time.
 */
export interface Profile {
  id: number;
  storeType: string;
  target: string;
  prf: string;
  active: boolean;
  enabled: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT STATE FACTORIES
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * DEFAULT_STATIONS
 * The factory-default station configuration.  Extracted as a top-level
 * constant so it can be referenced both by the initial signal value and
 * by resetToDefaults().
 */
const DEFAULT_STATIONS: Station[] = [
  { id: 1, label: 'Station 1', loadable: false, storeType: '', storeStatus: '', storePower: false, selected: false },
  {
    id: 2,
    label: 'Station 2',
    loadable: true,
    storeType: 'Hellfire',
    storeStatus: 'IDLE',
    storePower: true,
    selected: false,
    launcher: 'M310',
    substations: [
      { id: '2-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true, selected: false },
      { id: '2-2', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true, selected: false },
    ],
  },
  {
    id: 3,
    label: 'Station 3',
    loadable: true,
    storeType: 'GBU12',
    storeStatus: 'IDLE',
    storePower: false,
    selected: false,
  },
  {
    id: 5,
    label: 'Station 5',
    loadable: true,
    storeType: 'GBU38',
    storeStatus: 'IDLE',
    storePower: false,
    selected: false,
  },
  {
    id: 6,
    label: 'Station 6',
    loadable: true,
    storeType: 'Hellfire',
    storeStatus: 'IDLE',
    storePower: true,
    selected: false,
    launcher: 'M310',
    substations: [
      { id: '6-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true, selected: false },
      { id: '6-2', storeType: 'AWM', storeStatus: 'IDLE', storePower: false, selected: false },
    ],
  },
  { id: 7, label: 'Station 7', loadable: false, storeType: '', storeStatus: '', storePower: false, selected: false },
];

/**
 * DEFAULT_PROFILES
 * Factory-default profiles array (8 profiles, only profile 1 active/enabled).
 */
const DEFAULT_PROFILES: Profile[] = Array(8)
  .fill(null)
  .map((_, i) => ({
    id: i + 1,
    storeType: '',
    target: '',
    prf: '',
    active: i === 0,
    enabled: i === 0,
  }));

/**
 * DEFAULT_WARNINGS
 * Factory-default warnings/cautions list.
 */
const DEFAULT_WARNINGS: { level: 'WARNING' | 'CAUTION'; msg: string }[] = [
  { level: 'CAUTION', msg: 'JPF Not Present - Station 7' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE IMPLEMENTATION
   ═══════════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class SmsService {
  /** Injected persistence service for localStorage read/write. */
  private readonly persistence = inject(StatePersistenceService);

  // ── Global Indicators ──────────────────────────────────────────────────────

  /** Data-link indicator state (green = connected). */
  readonly linkState = signal<LinkState>('GREEN');

  /** System status indicator state (green = normal). */
  readonly stsState = signal<StsState>('GREEN');

  /** Currently selected station id (shared across Air-Ground sub-pages). */
  readonly selectedStationId = signal<number | null>(null);

  // ── Stations ───────────────────────────────────────────────────────────────

  /**
   * stations — the reactive list of all weapon stations.
   * Station 4 is not present (reserved / not used on this airframe).
   * Stations 2 and 6 have M310 launchers with two substation positions each.
   */
  readonly stations = signal<Station[]>(structuredClone(DEFAULT_STATIONS));

  // ── Profiles ───────────────────────────────────────────────────────────────

  /** profiles — 8 configurable weapon employment profiles. */
  readonly profiles = signal<Profile[]>(structuredClone(DEFAULT_PROFILES));

  // ── Warnings ───────────────────────────────────────────────────────────────

  /** warnings — active cautions and warnings displayed on the Status page. */
  readonly warnings = signal<{ level: 'WARNING' | 'CAUTION'; msg: string }[]>(structuredClone(DEFAULT_WARNINGS));

  // ── Per-Station Weapon Settings ────────────────────────────────────────────

  readonly gbuSettings = signal<Record<number, GbuSettings>>({});

  readonly hellfireSettings = signal<Record<number, HellfireSettings>>({});
  readonly releaseSettings = signal<Record<number, ReleaseSettings>>({});

  // ── Targets ────────────────────────────────────────────────────────────────

  /**
   * savedTargets — the list of saved targets available for weapon employment.
   * Starts empty to match the demo video initial state ("No Saved Targets").
   * Targets are added via the Create Target screen.
   */
  readonly savedTargets = signal<SavedTarget[]>([]);

  /** selectedTargetName — the name of the currently selected target. */
  readonly selectedTargetName = signal<string>('');

  // ── Store Assignments ──────────────────────────────────────────────────────

  /**
   * storeAssignments — per-target store assignments.
   * Maps target name → array of assigned store ID strings.
   * E.g. { 'CCTGP': ['2-1','2-2','6-1','6-2'], 'TARGET 01': ['3','5'] }
   *
   * Moved here from SelectTargetComponent so that:
   *   (a) assignments persist across page refresh via auto-save
   *   (b) assignments are accessible from other pages if needed
   */
  readonly storeAssignments = signal<Record<string, string[]>>({});

  // ── EOIR Sensor Data ───────────────────────────────────────────────────────

  /**
   * eoir — the current Electro-Optical / Infrared sensor position.
   * Used by the Launch Status page footer and the TGP target update feature.
   * NOTE: This is not persisted — it represents live sensor feed data.
   */
  readonly eoir = { lat: 'N 44° 40\' 30.975"', lon: 'W 2° 37\' 20.10"', alt: 1000, altRef: 'MSL' };

  /** mtsPrf — the MTS laser PRF code currently in use. */
  readonly mtsPrf = '1122';

  // ── Computed Helpers ───────────────────────────────────────────────────────

  /** armedStations — stations that are loaded and powered on. */
  readonly armedStations = computed(() => this.stations().filter((s) => s.storeType && s.storePower));

  /** warningCount — total number of active warnings/cautions. */
  readonly warningCount = computed(() => this.warnings().length);

  // ═══════════════════════════════════════════════════════════════════════════
  //  CONSTRUCTOR — HYDRATION + AUTO-SAVE
  // ═══════════════════════════════════════════════════════════════════════════

  constructor() {
    // ── Step 1: Hydrate from localStorage if a snapshot exists ──────────
    this.hydrateFromStorage();

    // ── Step 2: Set up auto-save effect ────────────────────────────────
    // This effect reads every persistable signal, which registers them as
    // dependencies.  Whenever ANY of them changes, the effect re-runs and
    // writes a fresh snapshot to localStorage.
    //
    // The first execution happens synchronously after construction and
    // writes the (just-hydrated or default) state back — this is harmless.
    //
    // We use a coalescing setTimeout(0) to batch multiple signal writes
    // that happen in the same microtask (e.g. "Apply To Type" updating
    // several stations at once) into a single localStorage write.
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    effect(() => {
      // Read every signal to register as a dependency.
      // We build the snapshot object here so the effect tracks all fields.
      const snapshot: StateSnapshot = {
        version: 1,
        stations: this.stations(),
        savedTargets: this.savedTargets(),
        selectedTargetName: this.selectedTargetName(),
        selectedStationId: this.selectedStationId(),
        gbuSettings: this.gbuSettings(),

        hellfireSettings: this.hellfireSettings(),
        releaseSettings: this.releaseSettings(),
        profiles: this.profiles(),
        warnings: this.warnings(),
        linkState: this.linkState(),
        stsState: this.stsState(),
        storeAssignments: this.storeAssignments(),
      };

      // Coalesce saves: cancel any pending save and schedule a new one.
      // setTimeout(0) defers to the next macrotask, batching all signal
      // writes from the current synchronous call stack into one save.
      if (saveTimeout !== null) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        this.persistence.save(snapshot);
        saveTimeout = null;
      }, 0);
    });
  }

  /**
   * hydrateFromStorage
   * Attempts to load a saved state snapshot and apply it to all signals.
   * If no snapshot exists or it's invalid, signals retain their defaults.
   */
  private hydrateFromStorage(): void {
    const snapshot = this.persistence.load();
    if (!snapshot) return;

    // Apply each field from the snapshot to its corresponding signal.
    // We use individual .set() calls rather than reconstructing signals
    // because the signals are already created with default values above.
    if (snapshot.stations) this.stations.set(snapshot.stations);
    if (snapshot.savedTargets) this.savedTargets.set(snapshot.savedTargets);
    if (snapshot.selectedTargetName !== undefined) this.selectedTargetName.set(snapshot.selectedTargetName);
    if (snapshot.selectedStationId !== undefined) this.selectedStationId.set(snapshot.selectedStationId);
    if (snapshot.gbuSettings) this.gbuSettings.set(snapshot.gbuSettings);

    if (snapshot.hellfireSettings) this.hellfireSettings.set(snapshot.hellfireSettings);
    if (snapshot.releaseSettings) this.releaseSettings.set(snapshot.releaseSettings);
    if (snapshot.profiles) this.profiles.set(snapshot.profiles);
    if (snapshot.warnings) this.warnings.set(snapshot.warnings);
    if (snapshot.linkState) this.linkState.set(snapshot.linkState);
    if (snapshot.stsState) this.stsState.set(snapshot.stsState);
    if (snapshot.storeAssignments) this.storeAssignments.set(snapshot.storeAssignments);

    // ── Reset transient runtime state ──────────────────────────────────
    // Station status and power are runtime values driven by the Select
    // Store BIT sequences.  They should not survive an app restart.
    this.resetRuntimeState();

    console.info('[SmsService] State hydrated from localStorage.');
  }

  /**
   * resetRuntimeState
   * Resets transient station fields (storeStatus, storePower) and
   * indicators back to their power-on defaults after hydration.
   * Preserves the loadout configuration (storeType, substations, launcher)
   * and all user-configured settings (targets, weapon settings, profiles).
   */
  private resetRuntimeState(): void {
    this.stations.update((list) =>
      list.map((s) => {
        const updated = { ...s, storeStatus: 'IDLE' as StoreStatus, storePower: false, selected: false };
        if (s.substations) {
          updated.substations = s.substations.map((sub) => ({
            ...sub,
            storeStatus: 'IDLE' as StoreStatus,
            storePower: false,
            selected: false,
          }));
        }
        return updated;
      }),
    );
    this.selectedStationId.set(null);
    this.linkState.set('GREEN');
    this.stsState.set('GREEN');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RESET TO DEFAULTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * resetToDefaults
   * Clears the persisted state from localStorage and resets every signal
   * to its factory-default value.  Use this for a "New Session" or
   * "Reset Trainer" action.
   */
  resetToDefaults(): void {
    this.persistence.clear();

    this.linkState.set('GREEN');
    this.stsState.set('GREEN');
    this.selectedStationId.set(null);
    this.stations.set(structuredClone(DEFAULT_STATIONS));
    this.profiles.set(structuredClone(DEFAULT_PROFILES));
    this.warnings.set(structuredClone(DEFAULT_WARNINGS));
    this.gbuSettings.set({});

    this.hellfireSettings.set({});
    this.releaseSettings.set({});
    this.savedTargets.set([]);
    this.selectedTargetName.set('');
    this.storeAssignments.set({});

    console.info('[SmsService] State reset to factory defaults.');
  }

  // ── Default Factories ──────────────────────────────────────────────────────

  /**
   * defaultGbu
   * Returns a fresh GbuSettings object with factory-default values
   * for a GBU-series laser-guided bomb.
   */
  defaultGbu(): GbuSettings {
    return {
      prf: '1511',
      laserReceiver: true,
      impactAngle: 65,
      impactAngleEnabled: true,
      impactAzimuth: 360,
      impactAzimuthEnabled: false,
      functionDelay: 0,
      armDelay: 14.0,
      offsetN: 0,
      offsetE: 0,
      offsetD: 0,
      fuzeArm: 'SAFE',
      fuzeArmPositions: [],
      fuzingType: 'NOSE/TAIL',
      guidanceMode: 'LGB',
    };
  }


  /**
   * defaultHellfire
   * Returns a fresh HellfireSettings object with factory-default values
   * for an AGM-114 Hellfire missile.
   */
  defaultHellfire(): HellfireSettings {
    return {
      laserCode: '1122',
      seekerMode: 'LOAL',
      launchMode: 'Direct',
      tmPower: false,
      fuzeFunction: 'INST',
      laserSpotTracker: true,
      warheadType: 'K-HEAT',
      rocketMotor: 'AGM-114K',
      salvoPulse: 1,
    };
  }

  /**
   * defaultRelease
   * Returns a fresh ReleaseSettings object with factory-default values.
   * Default ripple interval is 0.32s per the documentation.
   */
  defaultRelease(): ReleaseSettings {
    return {
      //Run-In settings
      runInMode: 'Track',
      runInCourse: 0.0,
      ttrType: 'DPI',
      isCourseDisabled: true,
      rippleCount: 1,
      rippleInterval: 0.32,
      releaseOrder: ['Store 2-1', 'Store 6-1', 'Store 2-2', 'Store 6-2'],
      targetType: 'Stationary',
      wezMode: 'WEZ',
      rtiAzimuth: 0,
      releaseMinDist: 0.0,
      releaseDesiredDistToggle: 'Off',
      desiredDistEnabled: false,
      releaseDesiredDist: 0.0,
      releaseMaxDist: 0.0,
      timeOfFlight: 'None',
      impactHeading: 'Off',
      impactRange: 0,
      stapleTransition: 0.0,
      gbuReleaseCueMode: 'CCRP',
      gbuComplexReleaseCueMode: 'LAR',
      owtMode: 'Off',
    };
  }

  // ── Settings Accessors (lazy-init pattern) ─────────────────────────────────

  /**
   * getGbuSettings
   * Retrieves GBU settings for a station, initialising to defaults if
   * the station hasn't been configured yet.
   */
  getGbuSettings(stationId: number): GbuSettings {
    const map = this.gbuSettings();
    if (!map[stationId]) {
      this.gbuSettings.update((m) => ({ ...m, [stationId]: this.defaultGbu() }));
    }
    return this.gbuSettings()[stationId];
  }

  /**
   * setGbuSettings
   * Persists updated GBU settings for a station.
   */
  setGbuSettings(stationId: number, s: GbuSettings): void {
    this.gbuSettings.update((m) => ({ ...m, [stationId]: s }));
  }


  /**
   * getHellfireSettings
   * Retrieves Hellfire settings for a station, initialising to defaults if needed.
   */
  getHellfireSettings(stationId: number): HellfireSettings {
    const map = this.hellfireSettings();
    if (!map[stationId]) {
      this.hellfireSettings.update((m) => ({ ...m, [stationId]: this.defaultHellfire() }));
    }
    return this.hellfireSettings()[stationId];
  }

  /**
   * setHellfireSettings
   * Persists updated Hellfire settings for a station.
   */
  setHellfireSettings(stationId: number, s: HellfireSettings): void {
    this.hellfireSettings.update((m) => ({ ...m, [stationId]: s }));
  }

  /**
   * getReleaseSettings
   * Retrieves release settings for a station, initialising to defaults if needed.
   */
  getReleaseSettings(stationId: number): ReleaseSettings {
    const map = this.releaseSettings();
    if (!map[stationId]) {
      this.releaseSettings.update((m) => ({ ...m, [stationId]: this.defaultRelease() }));
    }
    return this.releaseSettings()[stationId];
  }

  /**
   * setReleaseSettings
   * Persists updated release settings for a station.
   */
  setReleaseSettings(stationId: number, s: ReleaseSettings): void {
    this.releaseSettings.update((m) => ({ ...m, [stationId]: s }));
  }

  /**
   * setStationStoreType
   * Updates a station's storeType and synchronizes the substations array:
   * - Hellfire + M310 → 2 substation positions (X-1, X-2)
   * - Hellfire + M299 → 4 substation positions (X-1, X-2, X-3, X-4)
   * - Any other type  → removes substations (single-store rack)
   */
  setStationStoreType(stationId: number, type: StoreType, isTrainer = false, launcher: LauncherType = 'M310'): void {
    this.stations.update((stations) =>
      stations.map((st) => {
        if (st.id !== stationId) return st;

        if (type === 'Hellfire') {
          const subCount = launcher === 'M299' ? 4 : 2;

          // Reuse existing substations if count matches, otherwise rebuild
          const existingSubs = st.substations ?? [];
          const substations: SubStation[] = Array.from({ length: subCount }, (_, i) => {
            const pos = i + 1;
            const existing = existingSubs[i];
            return existing
              ? { ...existing, storeType: type }
              : {
                  id: `${stationId}-${pos}`,
                  storeType: type,
                  storeStatus: 'IDLE' as StoreStatus,
                  storePower: false,
                  selected: false,
                };
          });

          return {
            ...st,
            storeType: type,
            isTrainer,
            launcher,
            substations,
          };
        } else {
          // GBU / empty — no substation rack
          const { substations: _substations, launcher: _launcher, ...rest } = st;
          return { ...rest, storeType: type, isTrainer };
        }
      }),
    );
  }

  // ── Utility Methods ────────────────────────────────────────────────────────

  /**
   * getStoreFamily
   * Maps a StoreType to its weapon family for UI branching
   * (different pages show different controls per family).
   */
  getStoreFamily(type: StoreType): 'GBU' | 'Hellfire' | 'Other' {
    if (['GBU12', 'GBU38', 'GBU48', 'GBU49', 'GBU54'].includes(type)) return 'GBU';
    if (type === 'Hellfire') return 'Hellfire';
    return 'Other';
  }

  /**
   * getStatusClass
   * Returns the CSS class name for a given store status value.
   * Used to colour-code the status indicators throughout the UI.
   */
  getStatusClass(status: StoreStatus): string {
    switch (status) {
      case 'UNVRFD':
      case 'WARN':
      case 'MINREL':
      case 'DEGRD':
        return 'status-yellow';
      case 'INVLD':
      case 'ERROR':
      case 'FAILED':
      case 'HUNG':
        return 'status-red';
      case 'REL':
      case 'AWAY':
      case 'BIT':
      case 'READY':
      case 'IDLE':
      case 'JET':
      case 'JETTED':
      case 'AUR':
      case 'IBIT':
      case 'WARMUP':
        return 'status-green';
      default:
        return 'status-black';
    }
  }

  /**
   * getStationIndex
   * Returns the array index of a station by its id.
   */
  getStationIndex(stationId: number): number {
    return this.stations().findIndex((s) => s.id === stationId);
  }

  /**
   * getNextStationId
   * Returns the id of the next station in the list, or null if at the end.
   */
  getNextStationId(stationId: number): number | null {
    const list = this.stations();
    const idx = list.findIndex((s) => s.id === stationId);
    return idx < list.length - 1 ? list[idx + 1].id : null;
  }

  /**
   * getPrevStationId
   * Returns the id of the previous station in the list, or null if at the start.
   */
  getPrevStationId(stationId: number): number | null {
    const list = this.stations();
    const idx = list.findIndex((s) => s.id === stationId);
    return idx > 0 ? list[idx - 1].id : null;
  }
}
