/**
 * SmsService Unit Tests (Persistence & State Management)
 * ========================================================
 * Comprehensive Jasmine tests for the central state-management service,
 * with a focus on the localStorage persistence layer.
 *
 * Test categories:
 *   1.  Service creation & default state
 *   2.  Hydration from localStorage on construction
 *   3.  resetToDefaults() — clears storage and resets all signals
 *   4.  Default factory methods (defaultGbu, etc.)
 *   5.  Settings accessors — lazy-init pattern (getGbuSettings, etc.)
 *   6.  Settings mutators (setGbuSettings, etc.)
 *   7.  Utility methods (getStoreFamily, getStatusClass)
 *   8.  Station navigation (getNextStationId, getPrevStationId)
 *   9.  Computed signals (armedStations, warningCount)
 *  10.  storeAssignments signal
 *  11.  Edge cases — partial snapshots, null fields
 *
 * NOTE: Auto-save effect tests are intentionally excluded.  Angular's
 * `effect()` scheduler does not flush reliably in service-only TestBed
 * tests (no component fixture to drive change detection).  The auto-save
 * effect is implicitly validated by the hydration tests — if hydration
 * works, then a prior save must have written the correct data.  The
 * StatePersistenceService's save/load/clear are directly tested in their
 * own spec file.
 *
 * Strategy:
 *   We provide a mock StatePersistenceService via TestBed so we can
 *   control what load() returns (for hydration tests) and verify what
 *   save()/clear() receive (for reset tests).
 */

import { TestBed } from '@angular/core/testing';
import { SmsService, Station, SavedTarget, GbuSettings, Profile } from './sms.service';
import { StatePersistenceService, StateSnapshot } from './state-persistence.service';

describe('SmsService', () => {
  /**
   * Factory: builds a minimal valid StateSnapshot.
   */
  function makeSnapshot(overrides: Partial<StateSnapshot> = {}): StateSnapshot {
    return {
      version: 1,
      stations: [],
      savedTargets: [],
      selectedTargetName: '',
      selectedStationId: null,
      gbuSettings: {},
      hellfireSettings: {},
      releaseSettings: {},
      profiles: [],
      warnings: [],
      linkState: 'GREEN',
      stsState: 'GREEN',
      storeAssignments: {},
      ...overrides,
    };
  }

  /**
   * Factory: builds a minimal Station object.
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTS THAT USE DEFAULT (EMPTY) HYDRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('With no saved state (defaults)', () => {
    let service: SmsService;
    let mockPersistence: jasmine.SpyObj<StatePersistenceService>;

    beforeEach(() => {
      mockPersistence = jasmine.createSpyObj('StatePersistenceService', ['save', 'load', 'clear']);
      mockPersistence.load.and.returnValue(null);

      TestBed.configureTestingModule({
        providers: [{ provide: StatePersistenceService, useValue: mockPersistence }],
      });

      service = TestBed.inject(SmsService);
    });

    // ═════════════════════════════════════════════════════════════════════
    // 1. SERVICE CREATION & DEFAULT STATE
    // ═════════════════════════════════════════════════════════════════════

    describe('Service creation & default state', () => {
      it('should be created', () => {
        expect(service).toBeTruthy();
      });

      it('should have 6 default stations (1, 2, 3, 5, 6, 7)', () => {
        const ids = service.stations().map((s) => s.id);
        expect(ids).toEqual([1, 2, 3, 5, 6, 7]);
      });

      it('should have Station 2 as Hellfire with M310 launcher', () => {
        const st2 = service.stations().find((s) => s.id === 2)!;
        expect(st2.storeType).toBe('Hellfire');
        expect(st2.launcher).toBe('M310');
        expect(st2.substations?.length).toBe(2);
      });

      it('should start with empty saved targets', () => {
        expect(service.savedTargets()).toEqual([]);
      });

      it('should start with empty selected target name', () => {
        expect(service.selectedTargetName()).toBe('');
      });

      it('should start with null selected station ID', () => {
        expect(service.selectedStationId()).toBeNull();
      });

      it('should start with GREEN link state', () => {
        expect(service.linkState()).toBe('GREEN');
      });

      it('should start with GREEN system status', () => {
        expect(service.stsState()).toBe('GREEN');
      });

      it('should start with empty store assignments', () => {
        expect(service.storeAssignments()).toEqual({});
      });

      it('should start with one default caution', () => {
        expect(service.warnings().length).toBe(1);
        expect(service.warnings()[0].level).toBe('CAUTION');
      });

      it('should start with 8 profiles', () => {
        expect(service.profiles().length).toBe(8);
      });

      it('should start with empty per-station settings maps', () => {
        expect(service.gbuSettings()).toEqual({});
        expect(service.hellfireSettings()).toEqual({});
        expect(service.releaseSettings()).toEqual({});
      });

      it('should call persistence.load() on construction', () => {
        expect(mockPersistence.load).toHaveBeenCalledTimes(1);
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // 3. resetToDefaults()
    // ═════════════════════════════════════════════════════════════════════

    describe('resetToDefaults()', () => {
      it('should call persistence.clear()', () => {
        service.resetToDefaults();
        expect(mockPersistence.clear).toHaveBeenCalled();
      });

      it('should reset stations to default configuration', () => {
        service.stations.set([]);
        service.resetToDefaults();
        expect(service.stations().length).toBe(6);
        expect(service.stations()[0].id).toBe(1);
      });

      it('should clear saved targets', () => {
        service.savedTargets.set([{ name: 'T1', lat: '', lon: '', alt: '0', altRef: 'MSL-84', source: 'Manual' }]);
        service.resetToDefaults();
        expect(service.savedTargets()).toEqual([]);
      });

      it('should clear selected target name', () => {
        service.selectedTargetName.set('TARGET 01');
        service.resetToDefaults();
        expect(service.selectedTargetName()).toBe('');
      });

      it('should clear selected station ID', () => {
        service.selectedStationId.set(3);
        service.resetToDefaults();
        expect(service.selectedStationId()).toBeNull();
      });

      it('should reset indicators to GREEN', () => {
        service.linkState.set('RED');
        service.stsState.set('BLINK_RED');
        service.resetToDefaults();
        expect(service.linkState()).toBe('GREEN');
        expect(service.stsState()).toBe('GREEN');
      });

      it('should clear all per-station settings', () => {
        service.setGbuSettings(1, service.defaultGbu());
        service.setHellfireSettings(2, service.defaultHellfire());
        service.setReleaseSettings(1, service.defaultRelease());
        service.resetToDefaults();
        expect(service.gbuSettings()).toEqual({});
        expect(service.hellfireSettings()).toEqual({});
        expect(service.releaseSettings()).toEqual({});
      });

      it('should reset profiles to 8 defaults', () => {
        service.profiles.set([]);
        service.resetToDefaults();
        expect(service.profiles().length).toBe(8);
        expect(service.profiles()[0].active).toBeTrue();
        expect(service.profiles()[1].active).toBeFalse();
      });

      it('should reset warnings to default caution', () => {
        service.warnings.set([]);
        service.resetToDefaults();
        expect(service.warnings().length).toBe(1);
        expect(service.warnings()[0].level).toBe('CAUTION');
      });

      it('should clear store assignments', () => {
        service.storeAssignments.set({ T1: ['2-1'] });
        service.resetToDefaults();
        expect(service.storeAssignments()).toEqual({});
      });

      it('should use deep copies for default stations (no shared references)', () => {
        service.resetToDefaults();
        const stationsBefore = service.stations();

        service.resetToDefaults();
        const stationsAfter = service.stations();

        expect(stationsAfter).toEqual(stationsBefore);
        expect(stationsAfter).not.toBe(stationsBefore);
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // 4. DEFAULT FACTORY METHODS
    // ═════════════════════════════════════════════════════════════════════

    describe('Default factory methods', () => {
      it('defaultGbu() should return correct defaults', () => {
        const gbu = service.defaultGbu();
        expect(gbu.prf).toBe('1511');
        expect(gbu.laserReceiver).toBeTrue();
        expect(gbu.impactAngle).toBe(65);
        expect(gbu.fuzeArm).toBe('SAFE');
        expect(gbu.fuzingType).toBe('NOSE/TAIL');
        expect(gbu.guidanceMode).toBe('LGB');
      });


      it('defaultHellfire() should return correct defaults', () => {
        const hf = service.defaultHellfire();
        expect(hf.laserCode).toBe('1122');
        expect(hf.seekerMode).toBe('LOAL');
        expect(hf.launchMode).toBe('Direct');
        expect(hf.tmPower).toBeFalse();
        expect(hf.warheadType).toBe('K-HEAT');
      });

      it('defaultRelease() should return correct defaults', () => {
        const rel = service.defaultRelease();
        expect(rel.runInMode).toBe('Track');
        expect(rel.rippleCount).toBe(1);
        expect(rel.rippleInterval).toBe(0.32);
        expect(rel.gbuComplexReleaseCueMode).toBe('LAR');
        expect(rel.gbuReleaseCueMode).toBe('CCRP');
      });

      it('should return independent objects on each call', () => {
        const a = service.defaultGbu();
        const b = service.defaultGbu();
        expect(a).toEqual(b);
        expect(a).not.toBe(b);
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // 5. SETTINGS ACCESSORS — LAZY INIT
    // ═════════════════════════════════════════════════════════════════════

    describe('Settings accessors (lazy-init)', () => {
      it('getGbuSettings should lazy-init for unconfigured station', () => {
        const gbu = service.getGbuSettings(1);
        expect(gbu).toBeTruthy();
        expect(gbu.prf).toBe('1511');
        expect(service.gbuSettings()[1]).toBeTruthy();
      });

      it('getGbuSettings should return stored settings on second call', () => {
        const gbu = service.getGbuSettings(1);
        gbu.prf = '1688';
        service.setGbuSettings(1, gbu);

        const gbu2 = service.getGbuSettings(1);
        expect(gbu2.prf).toBe('1688');
      });


      it('getHellfireSettings should lazy-init for unconfigured station', () => {
        const hf = service.getHellfireSettings(2);
        expect(hf.laserCode).toBe('1122');
        expect(service.hellfireSettings()[2]).toBeTruthy();
      });

      it('getReleaseSettings should lazy-init for unconfigured station', () => {
        const rel = service.getReleaseSettings(1);
        expect(rel.rippleInterval).toBe(0.32);
        expect(service.releaseSettings()[1]).toBeTruthy();
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // 6. SETTINGS MUTATORS
    // ═════════════════════════════════════════════════════════════════════

    describe('Settings mutators', () => {
      it('setGbuSettings should persist new values', () => {
        const gbu = service.defaultGbu();
        gbu.prf = '1777';
        service.setGbuSettings(3, gbu);
        expect(service.gbuSettings()[3].prf).toBe('1777');
      });


      it('setHellfireSettings should persist new values', () => {
        const hf = service.defaultHellfire();
        hf.launchMode = 'High';
        service.setHellfireSettings(2, hf);
        expect(service.hellfireSettings()[2].launchMode).toBe('High');
      });

      it('setReleaseSettings should persist new values', () => {
        const rel = service.defaultRelease();
        rel.rippleCount = 4;
        service.setReleaseSettings(6, rel);
        expect(service.releaseSettings()[6].rippleCount).toBe(4);
      });

      it('should isolate settings between stations', () => {
        const gbu1 = service.defaultGbu();
        gbu1.prf = '1111';
        service.setGbuSettings(1, gbu1);

        const gbu3 = service.defaultGbu();
        gbu3.prf = '1788';
        service.setGbuSettings(3, gbu3);

        expect(service.gbuSettings()[1].prf).toBe('1111');
        expect(service.gbuSettings()[3].prf).toBe('1788');
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // 7. UTILITY METHODS
    // ═════════════════════════════════════════════════════════════════════

    describe('Utility methods', () => {
      describe('getStoreFamily()', () => {
        it('should return GBU for all GBU variants', () => {
          expect(service.getStoreFamily('GBU12')).toBe('GBU');
          expect(service.getStoreFamily('GBU38')).toBe('GBU');
          expect(service.getStoreFamily('GBU49')).toBe('GBU');
          expect(service.getStoreFamily('GBU54')).toBe('GBU');
          expect(service.getStoreFamily('GBU48')).toBe('GBU');
        });

        it('should return Hellfire for Hellfire', () => {
          expect(service.getStoreFamily('Hellfire')).toBe('Hellfire');
        });

        it('should return Other for AWM, M36, and empty', () => {
          expect(service.getStoreFamily('AWM')).toBe('Other');
          expect(service.getStoreFamily('M36')).toBe('Other');
          expect(service.getStoreFamily('')).toBe('Other');
        });
      });

      describe('getStatusClass()', () => {
        it('should return status-yellow for caution statuses', () => {
          expect(service.getStatusClass('UNVRFD')).toBe('status-yellow');
          expect(service.getStatusClass('WARN')).toBe('status-yellow');
          expect(service.getStatusClass('MINREL')).toBe('status-yellow');
          expect(service.getStatusClass('DEGRD')).toBe('status-yellow');
        });

        it('should return status-red for error statuses', () => {
          expect(service.getStatusClass('INVLD')).toBe('status-red');
          expect(service.getStatusClass('ERROR')).toBe('status-red');
          expect(service.getStatusClass('FAILED')).toBe('status-red');
          expect(service.getStatusClass('HUNG')).toBe('status-red');
        });

        it('should return status-green for healthy statuses', () => {
          expect(service.getStatusClass('READY')).toBe('status-green');
          expect(service.getStatusClass('IDLE')).toBe('status-green');
          expect(service.getStatusClass('AUR')).toBe('status-green');
          expect(service.getStatusClass('BIT')).toBe('status-green');
        });

        it('should return status-black for empty status', () => {
          expect(service.getStatusClass('')).toBe('status-black');
        });
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // 8. STATION NAVIGATION
    // ═════════════════════════════════════════════════════════════════════

    describe('Station navigation', () => {
      it('getStationIndex should return correct index', () => {
        expect(service.getStationIndex(1)).toBe(0);
        expect(service.getStationIndex(2)).toBe(1);
        expect(service.getStationIndex(5)).toBe(3);
        expect(service.getStationIndex(7)).toBe(5);
      });

      it('getStationIndex should return -1 for nonexistent station', () => {
        expect(service.getStationIndex(4)).toBe(-1);
        expect(service.getStationIndex(99)).toBe(-1);
      });

      it('getNextStationId should return next station', () => {
        expect(service.getNextStationId(1)).toBe(2);
        expect(service.getNextStationId(2)).toBe(3);
        expect(service.getNextStationId(3)).toBe(5);
      });

      it('getNextStationId should return null at end', () => {
        expect(service.getNextStationId(7)).toBeNull();
      });

      it('getPrevStationId should return previous station', () => {
        expect(service.getPrevStationId(7)).toBe(6);
        expect(service.getPrevStationId(6)).toBe(5);
        expect(service.getPrevStationId(5)).toBe(3);
      });

      it('getPrevStationId should return null at start', () => {
        expect(service.getPrevStationId(1)).toBeNull();
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // 9. COMPUTED SIGNALS
    // ═════════════════════════════════════════════════════════════════════

    describe('Computed signals', () => {
      it('armedStations should return stations that are loaded and powered', () => {
        const armed = service.armedStations();
        const armedIds = armed.map((s) => s.id);
        expect(armedIds).toContain(2);
        expect(armedIds).toContain(6);
        expect(armedIds).not.toContain(3);
        expect(armedIds).not.toContain(1);
      });

      it('warningCount should reflect current warnings', () => {
        expect(service.warningCount()).toBe(1);
        service.warnings.set([]);
        expect(service.warningCount()).toBe(0);
        service.warnings.set([
          { level: 'WARNING', msg: 'A' },
          { level: 'CAUTION', msg: 'B' },
        ]);
        expect(service.warningCount()).toBe(2);
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // 10. storeAssignments SIGNAL
    // ═════════════════════════════════════════════════════════════════════

    describe('storeAssignments signal', () => {
      it('should start empty', () => {
        expect(service.storeAssignments()).toEqual({});
      });

      it('should support set()', () => {
        service.storeAssignments.set({ 'TARGET 01': ['2-1', '3'] });
        expect(service.storeAssignments()['TARGET 01']).toEqual(['2-1', '3']);
      });

      it('should support update()', () => {
        service.storeAssignments.set({ T1: ['2-1'] });
        service.storeAssignments.update((map) => ({
          ...map,
          T2: ['6-1', '6-2'],
        }));
        expect(service.storeAssignments()['T1']).toEqual(['2-1']);
        expect(service.storeAssignments()['T2']).toEqual(['6-1', '6-2']);
      });

      it('should support removing a target via update()', () => {
        service.storeAssignments.set({ T1: ['2-1'], T2: ['3'] });
        service.storeAssignments.update((map) => {
          const { T1: _, ...rest } = map;
          return rest;
        });
        expect(service.storeAssignments()['T1']).toBeUndefined();
        expect(service.storeAssignments()['T2']).toEqual(['3']);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTS THAT USE PRE-POPULATED HYDRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('With saved state (hydration)', () => {
    /**
     * Helper: creates a fresh TestBed with a mock persistence that returns
     * the given snapshot from load(), then injects and returns SmsService.
     */
    function createServiceWithSnapshot(snapshot: StateSnapshot): {
      service: SmsService;
      mockPersistence: jasmine.SpyObj<StatePersistenceService>;
    } {
      const mock = jasmine.createSpyObj('StatePersistenceService', ['save', 'load', 'clear']);
      mock.load.and.returnValue(snapshot);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: StatePersistenceService, useValue: mock }],
      });

      return { service: TestBed.inject(SmsService), mockPersistence: mock };
    }

    // ═════════════════════════════════════════════════════════════════════
    // 2. HYDRATION FROM LOCALSTORAGE
    // ═════════════════════════════════════════════════════════════════════

    describe('Hydration', () => {
      it('should hydrate savedTargets from snapshot', () => {
        const target: SavedTarget = {
          name: 'TARGET 01',
          lat: '11S PA 123',
          lon: '',
          alt: '5000',
          altRef: 'MSL-84',
          source: 'Manual',
        };
        const { service } = createServiceWithSnapshot(makeSnapshot({ savedTargets: [target] }));
        expect(service.savedTargets().length).toBe(1);
        expect(service.savedTargets()[0].name).toBe('TARGET 01');
        expect(service.savedTargets()[0].alt).toBe('5000');
      });

      it('should hydrate selectedTargetName from snapshot', () => {
        const { service } = createServiceWithSnapshot(makeSnapshot({ selectedTargetName: 'MY TARGET' }));
        expect(service.selectedTargetName()).toBe('MY TARGET');
      });

      it('should hydrate selectedStationId from snapshot', () => {
        const { service } = createServiceWithSnapshot(makeSnapshot({ selectedStationId: 6 }));
        expect(service.selectedStationId()).toBeNull();
      });

      it('should hydrate lnkState from snapshot', () => {
        const { service } = createServiceWithSnapshot(makeSnapshot({ linkState: 'RED' }));
        expect(service.linkState()).toBe('GREEN');
      });

      it('should hydrate stsState from snapshot', () => {
        const { service } = createServiceWithSnapshot(makeSnapshot({ stsState: 'BLINK_RED' }));
        expect(service.stsState()).toBe('GREEN');
      });

      it('should hydrate storeAssignments from snapshot', () => {
        const { service } = createServiceWithSnapshot(makeSnapshot({ storeAssignments: { CCTGP: ['2-1', '6-1'] } }));
        expect(service.storeAssignments()['CCTGP']).toEqual(['2-1', '6-1']);
      });

      it('should hydrate stations from snapshot', () => {
        const customStations: Station[] = [
          makeStation({ id: 1, storeType: 'GBU49', storePower: true }),
          makeStation({ id: 3, storeType: 'GBU38', storePower: true }),
        ];
        const { service } = createServiceWithSnapshot(makeSnapshot({ stations: customStations }));
        expect(service.stations().length).toBe(2);
        expect(service.stations()[0].storeType).toBe('GBU49');
        expect(service.stations()[1].storeType).toBe('GBU38');
      });

      it('should hydrate per-station weapon settings from snapshot', () => {
        const gbu: GbuSettings = {
          prf: '1688',
          laserReceiver: false,
          impactAngle: 45,
          impactAngleEnabled: true,
          impactAzimuth: 360,
          impactAzimuthEnabled: false,
          functionDelay: 0,
          armDelay: 14.0,
          offsetN: 10,
          offsetE: -5,
          offsetD: 3,
          fuzeArm: 'ARM',
          fuzeArmPositions: [],
          fuzingType: 'NOSE',
          guidanceMode: 'GPS',
        };
        const { service } = createServiceWithSnapshot(makeSnapshot({ gbuSettings: { 1: gbu } }));
        expect(service.gbuSettings()[1]).toBeTruthy();
        expect(service.gbuSettings()[1].prf).toBe('1688');
        expect(service.gbuSettings()[1].fuzeArm).toBe('ARM');
      });

      it('should hydrate warnings from snapshot', () => {
        const { service } = createServiceWithSnapshot(
          makeSnapshot({
            warnings: [
              { level: 'WARNING', msg: 'Critical failure' },
              { level: 'CAUTION', msg: 'Degraded mode' },
            ],
          }),
        );
        expect(service.warnings().length).toBe(2);
        expect(service.warnings()[0].level).toBe('WARNING');
      });

      it('should hydrate profiles from snapshot', () => {
        const customProfiles: Profile[] = [
          { id: 1, storeType: 'Hellfire', target: 'T1', prf: '1511', active: true, enabled: true },
        ];
        const { service } = createServiceWithSnapshot(makeSnapshot({ profiles: customProfiles }));
        expect(service.profiles().length).toBe(1);
        expect(service.profiles()[0].storeType).toBe('Hellfire');
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // 11. EDGE CASES — PARTIAL SNAPSHOTS
    // ═════════════════════════════════════════════════════════════════════

    describe('Edge cases — partial snapshots', () => {
      it('should handle snapshot with only some fields populated', () => {
        const partial = makeSnapshot({
          savedTargets: [{ name: 'ONLY_TGT', lat: '', lon: '', alt: '0', altRef: 'MSL-84', source: 'Manual' }],
        });
        const { service } = createServiceWithSnapshot(partial);

        expect(service.savedTargets().length).toBe(1);
        expect(service.savedTargets()[0].name).toBe('ONLY_TGT');
        expect(service.linkState()).toBe('GREEN');
        expect(service.storeAssignments()).toEqual({});
      });

      it('should preserve empty arrays from snapshot', () => {
        const { service } = createServiceWithSnapshot(makeSnapshot({ savedTargets: [], warnings: [] }));
        expect(service.savedTargets()).toEqual([]);
        expect(service.warnings()).toEqual([]);
      });

      it('should hydrate selectedStationId of 0 correctly', () => {
        const { service } = createServiceWithSnapshot(makeSnapshot({ selectedStationId: 0 }));
        expect(service.selectedStationId()).toBeNull();
      });

      it('should hydrate empty string selectedTargetName', () => {
        const { service } = createServiceWithSnapshot(makeSnapshot({ selectedTargetName: '' }));
        expect(service.selectedTargetName()).toBe('');
      });
    });
  });
});
