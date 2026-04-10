/**
 * StatePersistenceService Unit Tests
 * ====================================
 * Comprehensive Jasmine tests for the localStorage persistence layer.
 *
 * Test categories:
 *   1.  Service creation
 *   2.  save() — writes snapshot to localStorage
 *   3.  load() — reads and parses snapshot from localStorage
 *   4.  load() — returns null when nothing is stored
 *   5.  load() — returns null for corrupt / unparseable JSON
 *   6.  load() — returns null and clears storage on schema version mismatch
 *   7.  clear() — removes snapshot from localStorage
 *   8.  save() round-trip — save then load returns equivalent data
 *   9.  Error resilience — save() handles localStorage.setItem throwing
 *  10.  Error resilience — load() handles localStorage.getItem throwing
 *  11.  Error resilience — clear() handles localStorage.removeItem throwing
 */

import { TestBed } from '@angular/core/testing';
import { StatePersistenceService, StateSnapshot } from './state-persistence.service';

describe('StatePersistenceService', () => {
  let service: StatePersistenceService;

  /** The localStorage key used by the service (must match the source). */
  const STORAGE_KEY = 'sms-trainer-state';

  /**
   * Factory: builds a minimal valid StateSnapshot with sensible defaults.
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

  beforeEach(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }

    TestBed.configureTestingModule({});
    service = TestBed.inject(StatePersistenceService);
  });

  afterEach(() => {
    // Wrapped in try/catch because a spy on removeItem that throws
    // might still be active from an error-resilience test.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SERVICE CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Service creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. save()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('save()', () => {
    it('should write snapshot JSON to localStorage', () => {
      const snapshot = makeSnapshot({ selectedTargetName: 'TARGET 01' });
      spyOn(localStorage, 'setItem').and.callThrough();

      service.save(snapshot);

      expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, jasmine.any(String));
    });

    it('should write valid JSON that round-trips correctly', () => {
      const snapshot = makeSnapshot({
        selectedTargetName: 'TARGET 01',
        linkState: 'RED',
        storeAssignments: { 'TARGET 01': ['2-1', '3'] },
      });

      service.save(snapshot);
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!) as StateSnapshot;
      expect(parsed.selectedTargetName).toBe('TARGET 01');
      expect(parsed.linkState).toBe('RED');
      expect(parsed.storeAssignments['TARGET 01']).toEqual(['2-1', '3']);
    });

    it('should overwrite previous snapshot', () => {
      service.save(makeSnapshot({ selectedTargetName: 'FIRST' }));
      service.save(makeSnapshot({ selectedTargetName: 'SECOND' }));

      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as StateSnapshot;
      expect(parsed.selectedTargetName).toBe('SECOND');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. load() — SUCCESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('load() — success', () => {
    it('should return parsed snapshot from localStorage', () => {
      const snapshot = makeSnapshot({
        savedTargets: [{ name: 'TGT1', lat: '11S PA 123', lon: '', alt: '1000', altRef: 'MSL-84', source: 'Manual' }],
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

      const loaded = service.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.savedTargets.length).toBe(1);
      expect(loaded!.savedTargets[0].name).toBe('TGT1');
    });

    it('should preserve all snapshot fields', () => {
      const snapshot = makeSnapshot({
        version: 1,
        selectedStationId: 3,
        linkState: 'BLINK_YELLOW',
        stsState: 'RED',
        storeAssignments: { CCTGP: ['2-1', '6-1'] },
        warnings: [{ level: 'WARNING', msg: 'Test warning' }],
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

      const loaded = service.load();
      expect(loaded!.selectedStationId).toBe(3);
      expect(loaded!.linkState).toBe('BLINK_YELLOW');
      expect(loaded!.stsState).toBe('RED');
      expect(loaded!.storeAssignments['CCTGP']).toEqual(['2-1', '6-1']);
      expect(loaded!.warnings[0].msg).toBe('Test warning');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. load() — NOTHING STORED
  // ═══════════════════════════════════════════════════════════════════════════

  describe('load() — nothing stored', () => {
    it('should return null when no snapshot exists', () => {
      expect(service.load()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. load() — CORRUPT JSON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('load() — corrupt JSON', () => {
    it('should return null for unparseable JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{{{not valid json!!!');

      spyOn(console, 'warn');
      const loaded = service.load();

      expect(loaded).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should return null for empty string', () => {
      localStorage.setItem(STORAGE_KEY, '');
      expect(service.load()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. load() — VERSION MISMATCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('load() — version mismatch', () => {
    it('should return null for a future version', () => {
      const snapshot = makeSnapshot({ version: 999 });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

      spyOn(console, 'warn');
      const loaded = service.load();

      expect(loaded).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should clear stale data from localStorage on version mismatch', () => {
      const snapshot = makeSnapshot({ version: 999 });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

      spyOn(console, 'warn');
      service.load();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should reject version 0', () => {
      const snapshot = makeSnapshot({ version: 0 });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

      spyOn(console, 'warn');
      expect(service.load()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. clear()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clear()', () => {
    it('should remove the snapshot from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, '{"version":1}');
      service.clear();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should not throw when nothing is stored', () => {
      expect(() => service.clear()).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ROUND-TRIP (save → load)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Round-trip (save → load)', () => {
    it('should round-trip a full snapshot', () => {
      const original = makeSnapshot({
        selectedTargetName: 'TARGET 01',
        selectedStationId: 2,
        linkState: 'BLINK_GREEN',
        stsState: 'YELLOW',
        savedTargets: [{ name: 'TARGET 01', lat: '11S PA 123', lon: '', alt: '5000', altRef: 'HAE-84', source: 'TGP' }],
        storeAssignments: { 'TARGET 01': ['2-1', '2-2', '6-1'] },
        warnings: [
          { level: 'CAUTION', msg: 'JPF Not Present - Station 7' },
          { level: 'WARNING', msg: 'Test Warning' },
        ],
        gbuSettings: {
          1: {
            prf: '1688',
            laserReceiver: true,
            impactAngle: 45,
            impactAngleEnabled: true,
            impactAzimuth: 360,
            impactAzimuthEnabled: false,
            functionDelay: 0,
            armDelay: 14.0,
            offsetN: 10,
            offsetE: -5,
            offsetD: 0,
            fuzeArm: 'ARM',
            fuzeArmPositions: [],
            fuzingType: 'NOSE',
            guidanceMode: 'LGB',
          },
        },
      });

      service.save(original);
      const loaded = service.load();

      expect(loaded).not.toBeNull();
      expect(loaded!.selectedTargetName).toBe('TARGET 01');
      expect(loaded!.selectedStationId).toBe(2);
      expect(loaded!.linkState).toBe('BLINK_GREEN');
      expect(loaded!.savedTargets.length).toBe(1);
      expect(loaded!.savedTargets[0].altRef).toBe('HAE-84');
      expect(loaded!.storeAssignments['TARGET 01']).toEqual(['2-1', '2-2', '6-1']);
      expect(loaded!.warnings.length).toBe(2);
      expect(loaded!.gbuSettings[1].prf).toBe('1688');
    });

    it('should round-trip an empty/default snapshot', () => {
      const original = makeSnapshot();
      service.save(original);
      const loaded = service.load();

      expect(loaded).not.toBeNull();
      expect(loaded!.stations).toEqual([]);
      expect(loaded!.savedTargets).toEqual([]);
      expect(loaded!.selectedTargetName).toBe('');
      expect(loaded!.selectedStationId).toBeNull();
      expect(loaded!.storeAssignments).toEqual({});
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. ERROR RESILIENCE — save()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error resilience — save()', () => {
    it('should not throw when localStorage.setItem throws', () => {
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
      spyOn(console, 'warn');

      expect(() => service.save(makeSnapshot())).not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. ERROR RESILIENCE — load()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error resilience — load()', () => {
    it('should return null when localStorage.getItem throws', () => {
      spyOn(localStorage, 'getItem').and.throwError('SecurityError');
      spyOn(console, 'warn');

      expect(service.load()).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ERROR RESILIENCE — clear()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error resilience — clear()', () => {
    /**
     * We use callFake to only throw for the service key, so afterEach
     * cleanup (which also calls removeItem) doesn't blow up.
     */
    it('should not throw when localStorage.removeItem throws', () => {
      const originalRemoveItem = localStorage.removeItem.bind(localStorage);
      spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
        if (key === STORAGE_KEY) {
          throw new Error('SecurityError');
        }
        return originalRemoveItem(key);
      });
      spyOn(console, 'warn');

      expect(() => service.clear()).not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
