import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SelectStoreComponent } from './select-store.component';
import { SmsService, Station } from '../../../services/sms.service';
import { StatePersistenceService } from '../../../services/state-persistence.service';

/** Builds a minimal Station for testing. */
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

describe('SelectStoreComponent', () => {
  let component: SelectStoreComponent;
  let fixture: ComponentFixture<SelectStoreComponent>;
  let sms: SmsService;

  beforeEach(async () => {
    const mockPersistence = jasmine.createSpyObj('StatePersistenceService', ['save', 'load', 'clear']);
    mockPersistence.load.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [SelectStoreComponent],
      providers: [{ provide: StatePersistenceService, useValue: mockPersistence }],
    }).compileComponents();

    sms = TestBed.inject(SmsService);
    fixture = TestBed.createComponent(SelectStoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMPONENT CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. availableStores()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('availableStores()', () => {
    it('should return only store types present in stations', () => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12' }), makeStation({ id: 2, storeType: 'Hellfire' })]);
      fixture.detectChanges();

      const types = component['availableStores']().map((s) => s.type);
      expect(types).toContain('GBU12');
      expect(types).toContain('Hellfire');
      expect(types).not.toContain('GBU38');
    });

    it('should show GBU38 row when GBU38 station present', () => {
      sms.stations.set([makeStation({ id: 5, storeType: 'GBU38' })]);
      fixture.detectChanges();

      const types = component['availableStores']().map((s) => s.type);
      expect(types).toContain('GBU38');
    });

    it('should skip AWM and M36 types', () => {
      sms.stations.set([
        makeStation({ id: 1, storeType: 'AWM' }),
        makeStation({ id: 2, storeType: 'M36' }),
        makeStation({ id: 3, storeType: 'GBU12' }),
      ]);
      fixture.detectChanges();

      const types = component['availableStores']().map((s) => s.type);
      expect(types).toEqual(['GBU12']);
    });

    it('should return empty array when no stores are loaded', () => {
      sms.stations.set([makeStation({ id: 1, storeType: '' }), makeStation({ id: 2, storeType: '' })]);
      fixture.detectChanges();

      expect(component['availableStores']().length).toBe(0);
    });

    it('should not duplicate rows for multiple stations of the same type', () => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12' }), makeStation({ id: 3, storeType: 'GBU12' })]);
      fixture.detectChanges();

      const types = component['availableStores']().map((s) => s.type);
      expect(types.filter((t) => t === 'GBU12').length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. isSelected()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isSelected()', () => {
    it('should return false when nothing is selected', () => {
      expect(component.isSelected('GBU12')).toBeFalse();
    });

    it('should return true for the selected type', () => {
      component.selectStore('GBU12');
      expect(component.isSelected('GBU12')).toBeTrue();
    });

    it('should return false for a non-selected type', () => {
      component.selectStore('GBU12');
      expect(component.isSelected('Hellfire')).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. isStorePowered()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isStorePowered()', () => {
    it('should return false when no station of that type is powered', () => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12', storePower: false })]);
      expect(component.isStorePowered('GBU12')).toBeFalse();
    });

    it('should return true when a station of that type is powered', () => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12', storePower: true })]);
      expect(component.isStorePowered('GBU12')).toBeTrue();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. isPowerDisabled()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isPowerDisabled()', () => {
    it('should return true for GBU12', () => {
      expect(component.isPowerDisabled('GBU12')).toBeTrue();
    });

    it('should return true for AWM', () => {
      expect(component.isPowerDisabled('AWM')).toBeTrue();
    });

    it('should return true for M36', () => {
      expect(component.isPowerDisabled('M36')).toBeTrue();
    });

    it('should return true for empty store type', () => {
      expect(component.isPowerDisabled('')).toBeTrue();
    });

    it('should return false for Hellfire', () => {
      expect(component.isPowerDisabled('Hellfire')).toBeFalse();
    });

    it('should return false for GBU38', () => {
      expect(component.isPowerDisabled('GBU38')).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. selectStore()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('selectStore()', () => {
    beforeEach(() => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12' }), makeStation({ id: 2, storeType: 'Hellfire' })]);
    });

    it('should select a store type', () => {
      component.selectStore('GBU12');
      expect(component.isSelected('GBU12')).toBeTrue();
    });

    it('should set selectedStationId on the service', () => {
      component.selectStore('GBU12');
      expect(sms.selectedStationId()).toBe(1);
    });

    it('should deselect when selecting the same type again', () => {
      component.selectStore('GBU12');
      component.selectStore('GBU12');
      expect(component.isSelected('GBU12')).toBeFalse();
      expect(sms.selectedStationId()).toBeNull();
    });

    it('should switch selection when selecting a different type', () => {
      component.selectStore('GBU12');
      component.selectStore('Hellfire');
      expect(component.isSelected('GBU12')).toBeFalse();
      expect(component.isSelected('Hellfire')).toBeTrue();
    });

    it('should trigger power on for powered store types', fakeAsync(() => {
      component.selectStore('Hellfire');
      expect(sms.linkState()).toBe('BLINK_GREEN');

      tick(1500);
      const hellfire = sms.stations().find((s) => s.storeType === 'Hellfire');
      expect(hellfire?.storePower).toBeTrue();

      // Let BIT sequence complete
      tick(20000);
    }));

    it('should not trigger power on for GBU12', () => {
      component.selectStore('GBU12');
      expect(sms.linkState()).not.toBe('BLINK_GREEN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. setSingle()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setSingle()', () => {
    beforeEach(() => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12' }), makeStation({ id: 3, storeType: 'GBU12' })]);
    });

    it('should set selection to the given type', () => {
      component.setSingle('GBU12');
      expect(component.isSelected('GBU12')).toBeTrue();
    });

    it('should set selectedStationId to first matching station', () => {
      component.setSingle('GBU12');
      expect(sms.selectedStationId()).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. executePowerOff()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('executePowerOff()', () => {
    it('should power off all stations of the given type', () => {
      sms.stations.set([
        makeStation({ id: 1, storeType: 'Hellfire', storePower: true, storeStatus: 'READY' }),
        makeStation({ id: 5, storeType: 'GBU12', storePower: false }),
      ]);

      component['executePowerOff']('Hellfire');

      const hellfire = sms.stations().find((s) => s.storeType === 'Hellfire');
      expect(hellfire?.storePower).toBeFalse();
      expect(hellfire?.storeStatus).toBe('IDLE');
    });

    it('should not affect stations of other types', () => {
      sms.stations.set([
        makeStation({ id: 1, storeType: 'Hellfire', storePower: true }),
        makeStation({ id: 5, storeType: 'GBU12', storePower: false }),
      ]);

      component['executePowerOff']('Hellfire');

      const gbu = sms.stations().find((s) => s.storeType === 'GBU12');
      expect(gbu?.storePower).toBeFalse();
      expect(gbu?.storeStatus).toBe('IDLE');
    });

    it('should power off substations of the matching type', () => {
      sms.stations.set([
        makeStation({
          id: 2,
          storeType: 'Hellfire',
          storePower: true,
          storeStatus: 'READY',
          substations: [
            { id: '2-1', storeType: 'Hellfire', storeStatus: 'READY', storePower: true, selected: false },
            { id: '2-2', storeType: 'Hellfire', storeStatus: 'READY', storePower: true, selected: false },
          ],
        }),
      ]);

      component['executePowerOff']('Hellfire');

      const station = sms.stations()[0];
      expect(station.substations![0].storePower).toBeFalse();
      expect(station.substations![0].storeStatus).toBe('IDLE');
      expect(station.substations![1].storePower).toBeFalse();
      expect(station.substations![1].storeStatus).toBe('IDLE');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. ngOnDestroy()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ngOnDestroy()', () => {
    it('should clear all BIT timers', fakeAsync(() => {
      sms.stations.set([makeStation({ id: 2, storeType: 'Hellfire' })]);

      component.selectStore('Hellfire');
      // BIT timers are now queued
      component.ngOnDestroy();

      // Flushing timers should not cause errors or state changes
      const statusBefore = sms.stations().find((s) => s.storeType === 'Hellfire')?.storeStatus;
      tick(30000);
      const statusAfter = sms.stations().find((s) => s.storeType === 'Hellfire')?.storeStatus;
      expect(statusAfter).toBe(statusBefore);
    }));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. DOM — EMPTY STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOM — empty state', () => {
    it('should show empty message when no stores are available', () => {
      sms.stations.set([makeStation({ id: 1, storeType: '' })]);
      fixture.detectChanges();

      const emptyMsg = fixture.nativeElement.querySelector('.empty-message');
      expect(emptyMsg).toBeTruthy();
      expect(emptyMsg.textContent.trim()).toBe('No stores available');
    });

    it('should not show empty message when stores are available', () => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12' })]);
      fixture.detectChanges();

      const emptyMsg = fixture.nativeElement.querySelector('.empty-message');
      expect(emptyMsg).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. DOM — STORE ROWS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOM — store rows', () => {
    it('should render a row for each available store', () => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12' }), makeStation({ id: 2, storeType: 'Hellfire' })]);
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.store-row');
      expect(rows.length).toBe(2);
    });

    it('should display store label text', () => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12' })]);
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.store-name');
      expect(label.textContent.trim()).toBe('GBU12 Legacy');
    });

    it('should render weapon icon image', () => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12' })]);
      fixture.detectChanges();

      const img: HTMLImageElement = fixture.nativeElement.querySelector('.store-icon-img');
      expect(img).toBeTruthy();
      expect(img.src).toContain('GBU.png');
    });

    it('should apply store-selected class on selected row', () => {
      sms.stations.set([makeStation({ id: 1, storeType: 'GBU12' })]);
      fixture.detectChanges();

      component.selectStore('GBU12');
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('.store-row');
      expect(row.classList).toContain('store-selected');
    });
  });
});
