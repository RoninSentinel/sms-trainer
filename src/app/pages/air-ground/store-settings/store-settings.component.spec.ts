/**
 * StoreSettingsComponent Unit Tests
 * ==================================
 * Comprehensive Jasmine/TestBed tests for the Store Settings page.
 *
 * Test categories:
 *   1. Component creation & initial state
 *   2. Store variant detection (Hellfire, GBU12, GBU-Complex, Other)
 *   3. Station navigation (next/prev)
 *   4. Sub-station navigation (Hellfire racks)
 *   5. Hellfire settings persistence (saveHf, launch mode, TM power, fuze function)
 *   6. GBU-12 settings persistence (saveGbu, fuze arm popup)
 *   7. GBU-Complex settings persistence (offsets, impact angle/azimuth toggles)
 *   8. Apply To Type propagation
 *   9. Computed signals (stationLabel, hasSubStations, segInfo, canGoNext/Prev)
 *  10. Edge cases (no station selected, AWM/Other store types)
 *
 * Setup note:
 *   This project does not yet have a test runner configured.  To run these
 *   tests, add a "test" architect target to angular.json (Karma) or install
 *   Jest with @angular-builders/jest.  Minimal Karma setup:
 *     ng generate config karma
 *     ng test
 *
 *   Alternatively, install Jest:
 *     npm install --save-dev jest @angular-builders/jest @types/jest
 *     npx ng test
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { StoreSettingsComponent } from './store-settings.component';
import { SmsService, Station } from '../../../services/sms.service';

describe('StoreSettingsComponent', () => {
  let component: StoreSettingsComponent;
  let fixture: ComponentFixture<StoreSettingsComponent>;
  let smsService: SmsService;

  /**
   * Helper function: sets the stations array in the SmsService to a custom
   * configuration, then selects a station by ID.  Triggers change detection
   * so computed signals and effects update.
   *
   * @param stations - Array of Station objects to load into the service.
   * @param selectId - Station ID to set as the selected station.
   */
  function setStationsAndSelect(stations: Station[], selectId: number | null): void {
    smsService.stations.set(stations);
    smsService.selectedStationId.set(selectId);
    fixture.detectChanges();
  }

  /**
   * Factory: builds a minimal Station object with sensible defaults.
   * Only the overridden fields need to be passed.
   *
   * @param overrides - Partial Station fields to customise.
   * @returns A fully-formed Station object.
   */
  function makeStation(overrides: Partial<Station> & { id: number }): Station {
    return {
      label: `Station ${overrides.id}`,
      storeType: '',
      storeStatus: 'IDLE',
      storePower: false,
      selected: false,
      ...overrides,
    } as Station;
  }

  // ── Test bed setup ────────────────────────────────────────────────────────

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreSettingsComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreSettingsComponent);
    component = fixture.componentInstance;
    smsService = TestBed.inject(SmsService);

    // Start with no station selected so tests can set up their own state
    smsService.selectedStationId.set(null);
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMPONENT CREATION & INITIAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component creation', () => {
    /**
     * Verifies the component can be instantiated without errors.
     */
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    /**
     * When no station is selected, storeVariant should return 'Other'
     * so no weapon-specific panel is rendered.
     */
    it('should default storeVariant to Other when no station selected', () => {
      expect(component['storeVariant']()).toBe('Other');
    });

    /**
     * The selected station computed signal should be undefined when
     * no station ID is set.
     */
    it('should have undefined selectedStation when nothing is selected', () => {
      expect(component['selectedStation']()).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. STORE VARIANT DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Store variant detection', () => {
    /**
     * Hellfire stations should resolve to the 'Hellfire' variant so the
     * LOAL / PRF / TM Power / Fuze Function panel is displayed.
     */
    it('should detect Hellfire variant for Hellfire stations', () => {
      setStationsAndSelect([makeStation({ id: 2, storeType: 'Hellfire', storePower: true })], 2);
      expect(component['storeVariant']()).toBe('Hellfire');
    });

    /**
     * GBU-12 stations should resolve to 'GBU12' for the simple
     * PRF + Fuze Arm layout.
     */
    it('should detect GBU12 variant for GBU12 stations', () => {
      setStationsAndSelect([makeStation({ id: 3, storeType: 'GBU12' })], 3);
      expect(component['storeVariant']()).toBe('GBU12');
    });

    /**
     * GBU-38 (mapped to 'GBU38' in the service) should use the complex
     * Target Settings layout.
     */
    it('should detect GBU-Complex for GBU38 stations', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);
      expect(component['storeVariant']()).toBe('GBU-Complex');
    });

    /**
     * GBU-49 should also resolve to GBU-Complex.
     */
    it('should detect GBU-Complex for GBU49 stations', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU49' })], 5);
      expect(component['storeVariant']()).toBe('GBU-Complex');
    });

    /**
     * GBU-54 should also resolve to GBU-Complex.
     */
    it('should detect GBU-Complex for GBU54 stations', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU54' })], 5);
      expect(component['storeVariant']()).toBe('GBU-Complex');
    });

    /**
     * GBU-48 should also resolve to GBU-Complex.
     */
    it('should detect GBU-Complex for GBU48 stations', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU48' })], 5);
      expect(component['storeVariant']()).toBe('GBU-Complex');
    });

    /**
     * GBU-38 store type should resolve to GBU-Complex.
     */
    it('should detect GBU-Complex for GBU38 store type', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);
      expect(component['storeVariant']()).toBe('GBU-Complex');
    });

    /**
     * AWM (test equipment) stations should resolve to 'Other' since they
     * have no configurable store settings.
     */
    it('should detect Other for AWM stations', () => {
      setStationsAndSelect([makeStation({ id: 3, storeType: 'AWM' })], 3);
      expect(component['storeVariant']()).toBe('Other');
    });

    /**
     * Stations with an empty store type should resolve to 'Other'.
     */
    it('should detect Other for empty store type', () => {
      setStationsAndSelect([makeStation({ id: 1, storeType: '' })], 1);
      expect(component['storeVariant']()).toBe('Other');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. STATION NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Station navigation', () => {
    const threeStations: Station[] = [
      makeStation({ id: 2, storeType: 'GBU12' }),
      makeStation({ id: 3, storeType: 'GBU12' }),
      makeStation({ id: 5, storeType: 'GBU12' }),
    ];

    /**
     * Pressing the right arrow when a middle station is selected should
     * advance to the next station.
     */
    it('should navigate to next station', () => {
      setStationsAndSelect(threeStations, 3);
      component.nextStation();
      expect(smsService.selectedStationId()).toBe(5);
    });

    /**
     * Pressing the left arrow when a middle station is selected should
     * move to the previous station.
     */
    it('should navigate to previous station', () => {
      setStationsAndSelect(threeStations, 3);
      component.prevStation();
      expect(smsService.selectedStationId()).toBe(2);
    });

    /**
     * canGoNext should be false when the last station is selected.
     */
    it('should disable next at the last station', () => {
      setStationsAndSelect(threeStations, 5);
      expect(component['canGoNext']()).toBeFalse();
    });

    /**
     * canGoPrev should be false when the first station is selected.
     */
    it('should disable prev at the first station', () => {
      setStationsAndSelect(threeStations, 2);
      expect(component['canGoPrev']()).toBeFalse();
    });

    /**
     * Calling nextStation when already at the last station should be a
     * no-op — the selection should not change.
     */
    it('should not change station when nextStation called at end', () => {
      setStationsAndSelect(threeStations, 5);
      component.nextStation();
      expect(smsService.selectedStationId()).toBe(5);
    });

    /**
     * Navigation should be a no-op when no station is selected.
     */
    it('should be no-op when no station selected', () => {
      setStationsAndSelect(threeStations, null);
      component.nextStation();
      expect(smsService.selectedStationId()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SUB-STATION NAVIGATION (HELLFIRE)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sub-station navigation', () => {
    const hellfireStation: Station[] = [
      makeStation({
        id: 2,
        storeType: 'Hellfire',
        storePower: true,
        substations: [
          { id: '2-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true, selected: false },
          { id: '2-2', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true, selected: false },
        ],
      }),
    ];

    /**
     * hasSubStations should be true for a Hellfire station with multiple
     * sub-stations (missiles on a rack).
     */
    it('should detect sub-stations on Hellfire racks', () => {
      setStationsAndSelect(hellfireStation, 2);
      expect(component['hasSubStations']()).toBeTrue();
    });

    /**
     * nextSubStation should advance the hfSubStationIdx.
     */
    it('should advance sub-station index', () => {
      setStationsAndSelect(hellfireStation, 2);
      expect(component.hfSubStationIdx()).toBe(0);
      component.nextSubStation();
      expect(component.hfSubStationIdx()).toBe(1);
    });

    /**
     * nextSubStation should not exceed the max sub-station index.
     */
    it('should not exceed max sub-station index', () => {
      setStationsAndSelect(hellfireStation, 2);
      component.nextSubStation();
      component.nextSubStation(); // Already at 1 (max for 2 subs)
      expect(component.hfSubStationIdx()).toBe(1);
    });

    /**
     * prevSubStation should decrement the index but not go below 0.
     */
    it('should decrement sub-station index and clamp at 0', () => {
      setStationsAndSelect(hellfireStation, 2);
      component.prevSubStation(); // Already at 0
      expect(component.hfSubStationIdx()).toBe(0);
    });

    /**
     * When navigating to a different station, the sub-station index
     * should reset to 0.
     */
    it('should reset sub-station index when changing stations', () => {
      const twoHellfires: Station[] = [
        ...hellfireStation,
        makeStation({
          id: 6,
          storeType: 'Hellfire',
          storePower: true,
          substations: [
            { id: '6-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true, selected: false },
            { id: '6-2', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true, selected: false },
          ],
        }),
      ];
      setStationsAndSelect(twoHellfires, 2);
      component.nextSubStation();
      expect(component.hfSubStationIdx()).toBe(1);

      // Navigate to station 6 — effect should reset sub-station index
      component.nextStation();
      fixture.detectChanges();
      expect(component.hfSubStationIdx()).toBe(0);
    });

    /**
     * A station without sub-stations should have hasSubStations = false.
     */
    it('should return false for hasSubStations on GBU station', () => {
      setStationsAndSelect([makeStation({ id: 3, storeType: 'GBU12' })], 3);
      expect(component['hasSubStations']()).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. HELLFIRE SETTINGS PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hellfire settings', () => {
    beforeEach(() => {
      setStationsAndSelect([makeStation({ id: 2, storeType: 'Hellfire', storePower: true })], 2);
    });

    /**
     * After selecting a Hellfire station, the component should have
     * loaded a local copy of HellfireSettings with default values.
     */
    it('should load default Hellfire settings on station select', () => {
      expect(component.hf).toBeTruthy();
      expect(component.hf.launchMode).toBe('Direct');
      expect(component.hf.laserCode).toBe('1122');
      expect(component.hf.tmPower).toBe(false);
      expect(component.hf.fuzeFunction).toBe('INST');
    });

    /**
     * selectLaunchMode should update the local HF settings, persist
     * to the service, and close the popup.
     */
    it('should update launch mode and close popup', () => {
      component.showLaunchModePopup = true;
      component.selectLaunchMode('High');

      expect(component.hf.launchMode).toBe('High');
      expect(component.showLaunchModePopup).toBeFalse();
      expect(smsService.getHellfireSettings(2).launchMode).toBe('High');
    });

    /**
     * selectTmPower should toggle the TM power flag and persist.
     */
    it('should toggle TM power on', () => {
      component.showTmPowerPopup = true;
      component.selectTmPower('On');

      expect(component.hf.tmPower).toBeTrue();
      expect(component.showTmPowerPopup).toBeFalse();
      expect(smsService.getHellfireSettings(2).tmPower).toBeTrue();
    });

    /**
     * selectTmPower('Off') should set TM power to false.
     */
    it('should toggle TM power off', () => {
      component.hf.tmPower = true;
      component.selectTmPower('Off');

      expect(component.hf.tmPower).toBeFalse();
      expect(smsService.getHellfireSettings(2).tmPower).toBeFalse();
    });

    /**
     * selectFuzeFunction should update the display label and close
     * the popup.
     */
    it('should select fuze function and close popup', () => {
      component.showFuzeFunctionPopup = true;
      component.selectFuzeFunction('10 ms');

      expect(component.hf.fuzeFunction).toBe('10 ms');
      expect(component.showFuzeFunctionPopup).toBeFalse();
      expect(smsService.getHellfireSettings(2).fuzeFunction).toBe('10 ms');
    });

    /**
     * saveHf should write the local copy back to the service.
     */
    it('should persist laser code changes via saveHf', () => {
      component.hf.laserCode = '1688';
      component.saveHf();

      expect(smsService.getHellfireSettings(2).laserCode).toBe('1688');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. GBU-12 SETTINGS PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GBU-12 settings', () => {
    beforeEach(() => {
      setStationsAndSelect([makeStation({ id: 3, storeType: 'GBU12' })], 3);
    });

    /**
     * After selecting a GBU-12 station, the component should have
     * loaded GBU settings with defaults.
     */
    it('should load default GBU settings on station select', () => {
      expect(component.gbu).toBeTruthy();
      expect(component.gbu.prf).toBe('1511');
      expect(component.gbu.fuzeArm).toBe('SAFE');
    });

    /**
     * saveGbu should persist PRF code changes to the service.
     */
    it('should persist PRF code changes via saveGbu', () => {
      component.gbu.prf = '1688';
      component.saveGbu();

      expect(smsService.getGbuSettings(3).prf).toBe('1688');
    });

    /**
     * toggleFuzeArmPosition should add a position to the selection set
     * on first click and remove it on second click.
     */
    it('should toggle fuze arm positions', () => {
      component.toggleFuzeArmPosition('Nose');
      expect(component.isFuzeArmSelected('Nose')).toBeTrue();
      expect(component.gbuFuzeArmLabel).toBe('Nose');

      component.toggleFuzeArmPosition('Tail');
      expect(component.isFuzeArmSelected('Tail')).toBeTrue();
      expect(component.gbuFuzeArmLabel).toBe('Nose + Tail');

      // Toggle off Nose
      component.toggleFuzeArmPosition('Nose');
      expect(component.isFuzeArmSelected('Nose')).toBeFalse();
      expect(component.gbuFuzeArmLabel).toBe('Tail');
    });

    /**
     * Selecting all three fuze positions should produce 'Nose/Center/Tail'.
     */
    it('should produce correct label with all three positions selected', () => {
      component.toggleFuzeArmPosition('Nose');
      component.toggleFuzeArmPosition('Center');
      component.toggleFuzeArmPosition('Tail');
      expect(component.gbuFuzeArmLabel).toBe('Nose + Center + Tail');
    });

    /**
     * doneFuzeArm should close the popup and set fuzeArm to 'ARM'
     * when at least one position is selected.
     */
    it('should arm fuze when positions selected and done pressed', () => {
      component.showFuzeArmPopup = true;
      component.toggleFuzeArmPosition('Nose');
      component.doneFuzeArm();

      expect(component.showFuzeArmPopup).toBeFalse();
      expect(component.gbu.fuzeArm).toBe('ARM');
      expect(smsService.getGbuSettings(3).fuzeArm).toBe('ARM');
    });

    /**
     * doneFuzeArm with no positions selected should set fuzeArm to 'SAFE'.
     */
    it('should safe fuze when no positions selected and done pressed', () => {
      component.gbu.fuzeArm = 'ARM';
      component.gbuFuzeArmSelections.clear();
      component.doneFuzeArm();

      expect(component.gbu.fuzeArm).toBe('SAFE');
      expect(smsService.getGbuSettings(3).fuzeArm).toBe('SAFE');
    });

    /**
     * gbuFuzeArmLabel should read 'None' when no positions are selected.
     */
    it('should show None label when fuze arm cleared', () => {
      component.gbuFuzeArmSelections.clear();
      component.toggleFuzeArmPosition('Nose');
      component.toggleFuzeArmPosition('Nose'); // Toggle off
      expect(component.gbuFuzeArmLabel).toBe('None');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. GBU-COMPLEX SETTINGS (GBU-38/49/54/48)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GBU-Complex settings', () => {
    beforeEach(() => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);
    });

    /**
     * GBU-Complex should use gbu (GbuSettings) since all GBU variants
     * share the same settings interface.
     */
    it('should load GBU settings for GBU-38', () => {
      expect(component.gbu).toBeTruthy();
      expect(component.gbu.offsetN).toBe(0);
      expect(component.gbu.offsetE).toBe(0);
      expect(component.gbu.offsetD).toBe(0);
    });

    /**
     * saveGbu should persist offset changes for GBU-Complex stations.
     */
    it('should persist offset changes', () => {
      component.gbu.offsetN = 100;
      component.gbu.offsetE = -50;
      component.gbu.offsetD = 25;
      component.saveGbu();

      const saved = smsService.getGbuSettings(5);
      expect(saved.offsetN).toBe(100);
      expect(saved.offsetE).toBe(-50);
      expect(saved.offsetD).toBe(25);
    });

    /**
     * toggleImpactAngle should flip the enabled flag.
     */
    it('should toggle impact angle enabled', () => {
      expect(component.gbu.impactAngleEnabled).toBeTrue();
      component.toggleImpactAngle();
      expect(component.gbu.impactAngleEnabled).toBeFalse();
      expect(smsService.getGbuSettings(5).impactAngleEnabled).toBeFalse();
      component.toggleImpactAngle();
      expect(component.gbu.impactAngleEnabled).toBeTrue();
    });

    /**
     * toggleImpactAzimuth should flip the enabled flag.
     */
    it('should toggle impact azimuth enabled', () => {
      expect(component.gbu.impactAzimuthEnabled).toBeFalse();
      component.toggleImpactAzimuth();
      expect(component.gbu.impactAzimuthEnabled).toBeTrue();
      expect(smsService.getGbuSettings(5).impactAzimuthEnabled).toBeTrue();
    });

    /**
     * Fuze arm toggle should flip between SAFE and ARM on GBU-Complex
     * and persist to the service.
     */
    it('should toggle fuze arm between SAFE and ARM', () => {
      expect(component.gbu.fuzeArm).toBe('SAFE');
      component.gbu.fuzeArm = 'ARM';
      component.saveGbu();
      expect(smsService.getGbuSettings(5).fuzeArm).toBe('ARM');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. APPLY TO TYPE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Apply To Type', () => {
    /**
     * applyToType should copy GBU settings from the selected station
     * to all other stations of the same store type.
     */
    it('should propagate GBU settings to matching stations', () => {
      const stations: Station[] = [
        makeStation({ id: 3, storeType: 'GBU12' }),
        makeStation({ id: 5, storeType: 'GBU12' }),
      ];
      setStationsAndSelect(stations, 3);

      component.gbu.prf = '1777';
      component.saveGbu();
      component.applyToType();

      expect(smsService.getGbuSettings(5).prf).toBe('1777');
    });

    /**
     * applyToType should copy Hellfire settings to matching stations.
     */
    it('should propagate Hellfire settings to matching stations', () => {
      const stations: Station[] = [
        makeStation({ id: 2, storeType: 'Hellfire', storePower: true }),
        makeStation({ id: 6, storeType: 'Hellfire', storePower: true }),
      ];
      setStationsAndSelect(stations, 2);

      component.hf.laserCode = '1688';
      component.hf.launchMode = 'High';
      component.saveHf();
      component.applyToType();

      const target = smsService.getHellfireSettings(6);
      expect(target.laserCode).toBe('1688');
      expect(target.launchMode).toBe('High');
    });

    /**
     * applyToType should not affect stations with a different store type.
     */
    it('should not affect stations with different store type', () => {
      const stations: Station[] = [
        makeStation({ id: 2, storeType: 'Hellfire', storePower: true }),
        makeStation({ id: 3, storeType: 'GBU12' }),
      ];
      setStationsAndSelect(stations, 2);

      component.hf.laserCode = '1688';
      component.saveHf();
      component.applyToType();

      // GBU station should still have default PRF, unaffected
      const gbuSettings = smsService.getGbuSettings(3);
      expect(gbuSettings.prf).toBe('1511'); // default
    });

    /**
     * applyToType should be a no-op when no station is selected.
     */
    it('should be no-op when no station selected', () => {
      smsService.selectedStationId.set(null);
      fixture.detectChanges();
      // Should not throw
      expect(() => component.applyToType()).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. COMPUTED SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Computed signals', () => {
    /**
     * stationLabel should show "Station N" for single-store stations.
     */
    it('should show correct station label for single-store station', () => {
      setStationsAndSelect([makeStation({ id: 3, storeType: 'GBU12' })], 3);
      expect(component['stationLabel']()).toBe('Station 3');
    });

    /**
     * stationLabel should show "Station N-M" for Hellfire sub-stations.
     */
    it('should show sub-station label for Hellfire', () => {
      setStationsAndSelect(
        [
          makeStation({
            id: 2,
            storeType: 'Hellfire',
            substations: [
              { id: '2-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true, selected: false },
              { id: '2-2', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true, selected: false },
            ],
          }),
        ],
        2,
      );
      expect(component['stationLabel']()).toBe('Station 2-1');

      component.nextSubStation();
      expect(component['stationLabel']()).toBe('Station 2-2');
    });

    /**
     * stationLabel should return '--' when no station is selected.
     */
    it('should show -- when no station selected', () => {
      smsService.selectedStationId.set(null);
      fixture.detectChanges();
      expect(component['stationLabel']()).toBe('--');
    });

    /**
     * segInfo should return a "N/N" string when multiple stations share
     * the same store type (indicating ripple-train sequence position).
     */
    it('should compute segInfo for multi-station same-type', () => {
      const stations: Station[] = [
        makeStation({ id: 2, storeType: 'Hellfire' }),
        makeStation({ id: 6, storeType: 'Hellfire' }),
      ];
      setStationsAndSelect(stations, 2);
      expect(component['segInfo']()).toBe('1/2');

      smsService.selectedStationId.set(6);
      fixture.detectChanges();
      expect(component['segInfo']()).toBe('2/2');
    });

    /**
     * segInfo should return null when the store type is unique (only one
     * station carries it).
     */
    it('should return null segInfo for unique store type', () => {
      setStationsAndSelect([makeStation({ id: 3, storeType: 'GBU12' })], 3);
      expect(component['segInfo']()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    /**
     * Saving settings when no station is selected should be a safe no-op.
     */
    it('should not throw when saving with no station selected', () => {
      smsService.selectedStationId.set(null);
      fixture.detectChanges();

      expect(() => component.saveGbu()).not.toThrow();
      expect(() => component.saveHf()).not.toThrow();
    });

    /**
     * The fuze function options array should contain exactly 16 entries
     * matching the Hellfire Fuze Function popup grid (4×4).
     */
    it('should have exactly 16 fuze function options', () => {
      expect(component.fuzeFunctionOptions.length).toBe(16);
    });

    /**
     * The launch mode options should contain exactly 3 entries
     * (Direct, High, Low).
     */
    it('should have exactly 3 launch mode options', () => {
      expect(component.launchModeOptions).toEqual(['Direct', 'High', 'Low']);
    });

    /**
     * The fuze arm positions should contain exactly 3 entries
     * (Nose, Center, Tail).
     */
    it('should have exactly 3 fuze arm positions', () => {
      expect(component.fuzeArmPositions).toEqual(['Nose', 'Center', 'Tail']);
    });

    /**
     * Switching from Hellfire to GBU-12 should correctly update the
     * variant and load new settings without errors.
     */
    it('should handle variant switch from Hellfire to GBU-12', () => {
      setStationsAndSelect(
        [makeStation({ id: 2, storeType: 'Hellfire', storePower: true }), makeStation({ id: 3, storeType: 'GBU12' })],
        2,
      );
      expect(component['storeVariant']()).toBe('Hellfire');

      smsService.selectedStationId.set(3);
      fixture.detectChanges();
      expect(component['storeVariant']()).toBe('GBU12');
      expect(component.gbu).toBeTruthy();
      expect(component.gbu.prf).toBe('1511');
    });

    /**
     * Multiple rapid station changes should not corrupt local state.
     */
    it('should handle rapid station switching', () => {
      const stations: Station[] = [
        makeStation({ id: 1, storeType: 'GBU12' }),
        makeStation({ id: 2, storeType: 'Hellfire', storePower: true }),
        makeStation({ id: 3, storeType: 'GBU38' }),
      ];
      smsService.stations.set(stations);

      smsService.selectedStationId.set(1);
      fixture.detectChanges();
      smsService.selectedStationId.set(2);
      fixture.detectChanges();
      smsService.selectedStationId.set(3);
      fixture.detectChanges();

      expect(component['storeVariant']()).toBe('GBU-Complex');
      expect(component.gbu).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. NUMPAD FLOW (open → confirm / cancel)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Numpad flow', () => {
    /**
     * openNumpad should configure all numpad properties and show the popup.
     */
    it('should configure and show the numpad popup', () => {
      component.openNumpad('Test Title', 10, 500, '42', () => {});

      expect(component.showNumpad).toBeTrue();
      expect(component.numpadTitle).toBe('Test Title');
      expect(component.numpadMin).toBe(10);
      expect(component.numpadMax).toBe(500);
      expect(component.numpadCurrentValue).toBe('42');
      expect(component.numpadAllowNegative).toBeFalse();
      expect(component.numpadAllowDecimal).toBeFalse();
    });

    /**
     * openNumpad should forward optional allowNegative and allowDecimal flags.
     */
    it('should forward allowNegative and allowDecimal options', () => {
      component.openNumpad('Offset', -100, 100, '0', () => {}, {
        allowNegative: true,
        allowDecimal: true,
      });

      expect(component.numpadAllowNegative).toBeTrue();
      expect(component.numpadAllowDecimal).toBeTrue();
    });

    /**
     * onNumpadConfirm should invoke the stored callback and hide the popup.
     */
    it('should invoke callback and close on confirm', () => {
      let captured = '';
      component.openNumpad('Title', 0, 999, '', (val) => {
        captured = val;
      });

      component.onNumpadConfirm('123');

      expect(captured).toBe('123');
      expect(component.showNumpad).toBeFalse();
    });

    /**
     * onNumpadCancel should hide the popup without invoking the callback.
     */
    it('should close popup without callback on cancel', () => {
      let called = false;
      component.openNumpad('Title', 0, 999, '', () => {
        called = true;
      });

      component.onNumpadCancel();

      expect(called).toBeFalse();
      expect(component.showNumpad).toBeFalse();
    });

    /**
     * openHfPrfNumpad should configure the numpad for Hellfire PRF range
     * and persist the confirmed value to hf.laserCode.
     */
    it('should open Hellfire PRF numpad and persist on confirm', () => {
      setStationsAndSelect([makeStation({ id: 2, storeType: 'Hellfire', storePower: true })], 2);

      component.openHfPrfNumpad();

      expect(component.showNumpad).toBeTrue();
      expect(component.numpadTitle).toBe('Enter PRF Code');
      expect(component.numpadMin).toBe(1111);
      expect(component.numpadMax).toBe(1788);
      expect(component.numpadCurrentValue).toBe(component.hf.laserCode);

      component.onNumpadConfirm('1688');

      expect(component.hf.laserCode).toBe('1688');
      expect(smsService.getHellfireSettings(2).laserCode).toBe('1688');
      expect(component.showNumpad).toBeFalse();
    });

    /**
     * openGbuPrfNumpad should configure the numpad for GBU PRF range
     * and persist the confirmed value to gbu.prf.
     */
    it('should open GBU PRF numpad and persist on confirm', () => {
      setStationsAndSelect([makeStation({ id: 3, storeType: 'GBU12' })], 3);

      component.openGbuPrfNumpad();

      expect(component.numpadMin).toBe(1511);
      expect(component.numpadMax).toBe(1788);

      component.onNumpadConfirm('1755');

      expect(component.gbu.prf).toBe('1755');
      expect(smsService.getGbuSettings(3).prf).toBe('1755');
    });

    /**
     * openOffsetNorthNumpad should allow negative values and persist
     * the parsed float to gbu.offsetN.
     */
    it('should open Offset North numpad with negative support and persist', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);

      component.openOffsetNorthNumpad();

      expect(component.numpadAllowNegative).toBeTrue();
      expect(component.numpadMin).toBe(-100);
      expect(component.numpadMax).toBe(100);

      component.onNumpadConfirm('-42');

      expect(component.gbu.offsetN).toBe(-42);
      expect(smsService.getGbuSettings(5).offsetN).toBe(-42);
    });

    /**
     * openOffsetEastNumpad should persist the parsed float to gbu.offsetE.
     */
    it('should open Offset East numpad and persist on confirm', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);

      component.openOffsetEastNumpad();
      component.onNumpadConfirm('75');

      expect(component.gbu.offsetE).toBe(75);
      expect(smsService.getGbuSettings(5).offsetE).toBe(75);
    });

    /**
     * openOffsetDownNumpad should persist the parsed float to gbu.offsetD.
     */
    it('should open Offset Down numpad and persist on confirm', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);

      component.openOffsetDownNumpad();
      component.onNumpadConfirm('-10');

      expect(component.gbu.offsetD).toBe(-10);
      expect(smsService.getGbuSettings(5).offsetD).toBe(-10);
    });

    /**
     * openImpactAngleNumpad should persist the parsed float to gbu.impactAngle.
     */
    it('should open Impact Angle numpad and persist on confirm', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);

      component.openImpactAngleNumpad();

      expect(component.numpadMin).toBe(20);
      expect(component.numpadMax).toBe(90);

      component.onNumpadConfirm('45');

      expect(component.gbu.impactAngle).toBe(45);
      expect(smsService.getGbuSettings(5).impactAngle).toBe(45);
    });

    /**
     * openImpactAzimuthNumpad should persist the parsed float to gbu.impactAzimuth.
     */
    it('should open Impact Azimuth numpad and persist on confirm', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);

      component.openImpactAzimuthNumpad();

      expect(component.numpadMin).toBe(0);
      expect(component.numpadMax).toBe(360);

      component.onNumpadConfirm('270');

      expect(component.gbu.impactAzimuth).toBe(270);
      expect(smsService.getGbuSettings(5).impactAzimuth).toBe(270);
    });

    /**
     * openFunctionDelayNumpad should persist the parsed float to gbu.functionDelay.
     */
    it('should open Function Delay numpad and persist on confirm', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);

      component.openFunctionDelayNumpad();

      expect(component.numpadMin).toBe(0);
      expect(component.numpadMax).toBe(999);

      component.onNumpadConfirm('500');

      expect(component.gbu.functionDelay).toBe(500);
      expect(smsService.getGbuSettings(5).functionDelay).toBe(500);
    });

    /**
     * openArmDelayNumpad should allow decimals and persist the parsed
     * float to gbu.armDelay.
     */
    it('should open Arm Delay numpad with decimal support and persist', () => {
      setStationsAndSelect([makeStation({ id: 5, storeType: 'GBU38' })], 5);

      component.openArmDelayNumpad();

      expect(component.numpadAllowDecimal).toBeTrue();
      expect(component.numpadMax).toBe(99.9);

      component.onNumpadConfirm('12.5');

      expect(component.gbu.armDelay).toBe(12.5);
      expect(smsService.getGbuSettings(5).armDelay).toBe(12.5);
    });

    /**
     * Cancelling a field-specific numpad should not change the setting value.
     */
    it('should not change laser code when Hellfire PRF numpad is cancelled', () => {
      setStationsAndSelect([makeStation({ id: 2, storeType: 'Hellfire', storePower: true })], 2);
      const originalCode = component.hf.laserCode;

      component.openHfPrfNumpad();
      component.onNumpadCancel();

      expect(component.hf.laserCode).toBe(originalCode);
      expect(smsService.getHellfireSettings(2).laserCode).toBe(originalCode);
    });
  });
});
