import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { InventoryPageComponent } from './inventory.component';
import { SmsService, Station, StoreStatus } from '../../services/sms.service';
import { StatePersistenceService } from '../../services/state-persistence.service';

/** Builds a minimal Station for testing. */
function makeStation(overrides: Partial<Station> & { id: number }): Station {
  return {
    label: `Station ${overrides.id}`,
    loadable: true,
    storeType: '',
    storeStatus: '',
    storePower: false,
    selected: false,
    ...overrides,
  } as Station;
}

describe('InventoryPageComponent', () => {
  let component: InventoryPageComponent;
  let fixture: ComponentFixture<InventoryPageComponent>;
  let sms: SmsService;

  beforeEach(async () => {
    const mockPersistence = jasmine.createSpyObj('StatePersistenceService', ['save', 'load', 'clear']);
    mockPersistence.load.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [InventoryPageComponent],
      providers: [{ provide: StatePersistenceService, useValue: mockPersistence }],
    }).compileComponents();

    sms = TestBed.inject(SmsService);
    fixture = TestBed.createComponent(InventoryPageComponent);
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
  // 2. titleBar computed
  // ═══════════════════════════════════════════════════════════════════════════

  describe('titleBar()', () => {
    it('should show "Inventory" when no station is selected', () => {
      component.selectedStationId.set(null);
      expect(component['titleBar']()).toBe('Inventory');
    });

    it('should include the station id when one is selected', () => {
      component.selectedStationId.set(3);
      expect(component['titleBar']()).toBe('Inventory: Station 3');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. canClearStore computed
  // ═══════════════════════════════════════════════════════════════════════════

  describe('canClearStore()', () => {
    it('should be false when no station is selected', () => {
      component.selectedStationId.set(null);
      expect(component['canClearStore']()).toBeFalse();
    });

    it('should be false when selected station has no store type', () => {
      sms.stations.set([makeStation({ id: 3, storeType: '' })]);
      component.selectedStationId.set(3);
      expect(component['canClearStore']()).toBeFalse();
    });

    it('should be true when selected station has a store type', () => {
      sms.stations.set([makeStation({ id: 3, storeType: 'GBU12' })]);
      component.selectedStationId.set(3);
      expect(component['canClearStore']()).toBeTrue();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. selectedStation computed
  // ═══════════════════════════════════════════════════════════════════════════

  describe('selectedStation()', () => {
    it('should return undefined when no station is selected', () => {
      component.selectedStationId.set(null);
      expect(component['selectedStation']()).toBeUndefined();
    });

    it('should return the matching station object', () => {
      const st = makeStation({ id: 5, storeType: 'GBU38' });
      sms.stations.set([st]);
      component.selectedStationId.set(5);
      expect(component['selectedStation']()?.id).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. selectStation()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('selectStation()', () => {
    it('should set selectedStationId on the component', () => {
      component.selectStation(3);
      expect(component.selectedStationId()).toBe(3);
    });

    it('should set selectedStationId on the service', () => {
      component.selectStation(5);
      expect(sms.selectedStationId()).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. assignStore()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('assignStore()', () => {
    beforeEach(() => {
      sms.stations.set([makeStation({ id: 3, storeType: '', loadable: true })]);
      component.selectedStationId.set(3);
    });

    it('should do nothing when no station is selected', () => {
      component.selectedStationId.set(null);
      const before = sms.stations()[0].storeType;
      component.assignStore('GBU12', false);
      expect(sms.stations()[0].storeType).toBe(before);
    });

    it('should do nothing when station is not loadable', () => {
      sms.stations.set([makeStation({ id: 3, storeType: '', loadable: false })]);
      component.selectedStationId.set(3);
      component.assignStore('GBU12', false);
      expect(sms.stations()[0].storeType).toBe('');
    });

    it('should set store type on a loadable station', () => {
      component.assignStore('GBU12', false);
      const st = sms.stations().find((s) => s.id === 3);
      expect(st?.storeType).toBe('GBU12');
    });

    it('should set storeStatus to UNVRFD after assignment', () => {
      component.assignStore('GBU12', false);
      const st = sms.stations().find((s) => s.id === 3);
      expect(st?.storeStatus).toBe('UNVRFD');
    });

    it('should set substations storeStatus to UNVRFD when present', () => {
      sms.stations.set([
        makeStation({
          id: 2,
          storeType: 'Hellfire',
          loadable: true,
          substations: [
            { id: '2-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: false, selected: false },
            { id: '2-2', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: false, selected: false },
          ],
        }),
      ]);
      component.selectedStationId.set(2);
      component.assignStore('Hellfire', false);

      const st = sms.stations().find((s) => s.id === 2);
      expect(st?.substations![0].storeStatus).toBe('UNVRFD');
      expect(st?.substations![1].storeStatus).toBe('UNVRFD');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. clearStore()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clearStore()', () => {
    it('should do nothing when no station is selected', () => {
      sms.stations.set([makeStation({ id: 3, storeType: 'GBU12' })]);
      component.selectedStationId.set(null);
      component.clearStore();
      expect(sms.stations()[0].storeType).toBe('GBU12');
    });

    it('should clear the store type on the selected station', () => {
      sms.stations.set([makeStation({ id: 3, storeType: 'GBU12' })]);
      component.selectedStationId.set(3);
      component.clearStore();
      const st = sms.stations().find((s) => s.id === 3);
      expect(st?.storeType).toBe('');
    });

    it('should set storeStatus to empty after clearing', () => {
      sms.stations.set([makeStation({ id: 3, storeType: 'GBU12', storeStatus: 'IDLE' })]);
      component.selectedStationId.set(3);
      component.clearStore();
      const st = sms.stations().find((s) => s.id === 3);
      expect(st?.storeStatus).toBe('' as StoreStatus);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. clearStation()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clearStation()', () => {
    it('should clear the store and deselect the station', () => {
      sms.stations.set([makeStation({ id: 3, storeType: 'GBU12' })]);
      component.selectedStationId.set(3);
      component.clearStation();

      expect(component.selectedStationId()).toBeNull();
      expect(sms.selectedStationId()).toBeNull();
      expect(sms.stations().find((s) => s.id === 3)?.storeType).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. startVerify() / cancelVerify() / modify()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('startVerify()', () => {
    it('should set verifyState to in-progress immediately', () => {
      component.startVerify();
      expect(component.verifyState()).toBe('in-progress');
    });

    it('should set verifyState to done after 2500ms', fakeAsync(() => {
      component.startVerify();
      tick(2500);
      expect(component.verifyState()).toBe('done');
    }));

    it('should set storeStatus to IDLE for stations with a store type after 2500ms', fakeAsync(() => {
      sms.stations.set([
        makeStation({ id: 3, storeType: 'GBU12', storeStatus: 'UNVRFD' }),
        makeStation({ id: 5, storeType: '', storeStatus: '' }),
      ]);
      component.startVerify();
      tick(2500);

      const withStore = sms.stations().find((s) => s.id === 3);
      const empty = sms.stations().find((s) => s.id === 5);
      expect(withStore?.storeStatus).toBe('IDLE');
      expect(empty?.storeStatus).toBe('' as StoreStatus);
    }));

    it('should update substation storeStatus to IDLE when substation has a store type', fakeAsync(() => {
      sms.stations.set([
        makeStation({
          id: 2,
          storeType: 'Hellfire',
          storeStatus: 'UNVRFD',
          substations: [
            { id: '2-1', storeType: 'Hellfire', storeStatus: 'UNVRFD', storePower: false, selected: false },
            { id: '2-2', storeType: '', storeStatus: '', storePower: false, selected: false },
          ],
        }),
      ]);
      component.startVerify();
      tick(2500);

      const st = sms.stations().find((s) => s.id === 2);
      expect(st?.substations![0].storeStatus).toBe('IDLE');
      expect(st?.substations![1].storeStatus).toBe('' as StoreStatus);
    }));
  });

  describe('cancelVerify()', () => {
    it('should reset verifyState to idle', fakeAsync(() => {
      component.startVerify();
      expect(component.verifyState()).toBe('in-progress');
      component.cancelVerify();
      expect(component.verifyState()).toBe('idle');
      tick(2500); // prevent timer leak
    }));
  });

  describe('modify()', () => {
    it('should reset verifyState to idle from done', fakeAsync(() => {
      component.startVerify();
      tick(2500);
      expect(component.verifyState()).toBe('done');
      component.modify();
      expect(component.verifyState()).toBe('idle');
    }));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. getStatusClass()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getStatusClass()', () => {
    it('should return status-yellow for UNVRFD', () => {
      expect(component.getStatusClass('UNVRFD')).toBe('status-yellow');
    });

    it('should return status-red for ERROR', () => {
      expect(component.getStatusClass('ERROR')).toBe('status-red');
    });

    it('should return status-green for IDLE', () => {
      expect(component.getStatusClass('IDLE')).toBe('status-green');
    });

    it('should return status-black for empty string', () => {
      expect(component.getStatusClass('' as StoreStatus)).toBe('status-black');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. storeTypeOptions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('storeTypeOptions', () => {
    it('should contain 9 options', () => {
      expect(component.storeTypeOptions.length).toBe(9);
    });

    it('should have both trainer and non-trainer variants', () => {
      const trainers = component.storeTypeOptions.filter((o) => o.trainer);
      const nonTrainers = component.storeTypeOptions.filter((o) => !o.trainer);
      expect(trainers.length).toBeGreaterThan(0);
      expect(nonTrainers.length).toBeGreaterThan(0);
    });

    it('should include GBU54 as a non-trainer option', () => {
      const gbu54 = component.storeTypeOptions.find((o) => o.label === 'GBU54');
      expect(gbu54).toBeTruthy();
      expect(gbu54?.trainer).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. DOM — title bar
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOM — title bar', () => {
    it('should display "Inventory" when no station is selected', () => {
      component.selectedStationId.set(null);
      fixture.detectChanges();
      const titleBar: HTMLElement = fixture.nativeElement.querySelector('.title-bar');
      expect(titleBar.textContent?.trim()).toBe('Inventory');
    });

    it('should display station id in title bar when station is selected', () => {
      sms.stations.set([makeStation({ id: 3 })]);
      component.selectStation(3);
      fixture.detectChanges();
      const titleBar: HTMLElement = fixture.nativeElement.querySelector('.title-bar');
      expect(titleBar.textContent?.trim()).toBe('Inventory: Station 3');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. DOM — station buttons
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOM — station buttons', () => {
    it('should render a button for each loadable station', () => {
      sms.stations.set([
        makeStation({ id: 2, loadable: true }),
        makeStation({ id: 3, loadable: true }),
        makeStation({ id: 1, loadable: false }),
      ]);
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('.station-row-btns .sms-btn');
      expect(buttons.length).toBe(2);
    });

    it('should apply active class to the selected station button', () => {
      sms.stations.set([makeStation({ id: 3, loadable: true })]);
      component.selectStation(3);
      fixture.detectChanges();
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.station-row-btns .sms-btn');
      expect(btn.classList).toContain('active');
    });

    it('should not apply active class to non-selected station buttons', () => {
      sms.stations.set([makeStation({ id: 3, loadable: true }), makeStation({ id: 5, loadable: true })]);
      component.selectStation(3);
      fixture.detectChanges();
      const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll(
        '.station-row-btns .sms-btn',
      );
      expect(buttons[0].classList).toContain('active');
      expect(buttons[1].classList).not.toContain('active');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. DOM — control buttons
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOM — control buttons', () => {
    it('should disable Clear Store button when no store is loaded', () => {
      sms.stations.set([makeStation({ id: 3, storeType: '' })]);
      component.selectedStationId.set(3);
      fixture.detectChanges();
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.control-section .sms-btn:first-child');
      expect(btn.disabled).toBeTrue();
    });

    it('should enable Clear Store button when a store is loaded', () => {
      sms.stations.set([makeStation({ id: 3, storeType: 'GBU12' })]);
      component.selectedStationId.set(3);
      fixture.detectChanges();
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.control-section .sms-btn:first-child');
      expect(btn.disabled).toBeFalse();
    });

    it('should disable Clear Station button when no station is selected', () => {
      component.selectedStationId.set(null);
      fixture.detectChanges();
      const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.control-section .sms-btn');
      const clearStationBtn = Array.from(buttons).find((b) => b.textContent?.trim() === 'Clear Station');
      expect(clearStationBtn?.disabled).toBeTrue();
    });

    it('should enable Clear Station button when a station is selected', () => {
      sms.stations.set([makeStation({ id: 3 })]);
      component.selectedStationId.set(3);
      fixture.detectChanges();
      const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.control-section .sms-btn');
      const clearStationBtn = Array.from(buttons).find((b) => b.textContent?.trim() === 'Clear Station');
      expect(clearStationBtn?.disabled).toBeFalse();
    });

    it('should show Start Verify button when verifyState is idle', () => {
      component.verifyState.set('idle');
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('.sms-btn.guarded');
      expect(btn?.textContent?.trim()).toBe('Start Verify');
    });

    it('should show Modify button when verifyState is done', fakeAsync(() => {
      component.startVerify();
      tick(2500);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('.sms-btn.guarded');
      expect(btn?.textContent?.trim()).toBe('Modify');
    }));

    it('should show Cancel Verify button when verifyState is in-progress', () => {
      component.verifyState.set('in-progress');
      fixture.detectChanges();
      const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.control-section .sms-btn');
      const cancelBtn = Array.from(buttons).find((b) => b.textContent?.trim() === 'Cancel Verify');
      expect(cancelBtn).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. DOM — store type grid
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOM — store type grid', () => {
    it('should show store type grid when a station is selected and verify is not in progress', () => {
      sms.stations.set([makeStation({ id: 3, loadable: true })]);
      component.selectedStationId.set(3);
      component.verifyState.set('idle');
      fixture.detectChanges();
      const grid = fixture.nativeElement.querySelector('.store-grid');
      expect(grid).toBeTruthy();
    });

    it('should hide store type grid when verify is in progress', () => {
      sms.stations.set([makeStation({ id: 3, loadable: true })]);
      component.selectedStationId.set(3);
      component.verifyState.set('in-progress');
      fixture.detectChanges();
      const grid = fixture.nativeElement.querySelector('.store-grid');
      expect(grid).toBeNull();
    });

    it('should hide store type grid when no station is selected', () => {
      component.selectedStationId.set(null);
      component.verifyState.set('idle');
      fixture.detectChanges();
      const grid = fixture.nativeElement.querySelector('.store-grid');
      expect(grid).toBeNull();
    });

    it('should render 9 store type buttons', () => {
      sms.stations.set([makeStation({ id: 3, loadable: true })]);
      component.selectedStationId.set(3);
      component.verifyState.set('idle');
      fixture.detectChanges();
      const btns = fixture.nativeElement.querySelectorAll('.store-type-btn');
      expect(btns.length).toBe(9);
    });

    it('should apply trainer-btn class to trainer options', () => {
      sms.stations.set([makeStation({ id: 3, loadable: true })]);
      component.selectedStationId.set(3);
      component.verifyState.set('idle');
      fixture.detectChanges();
      const trainerBtns = fixture.nativeElement.querySelectorAll('.store-type-btn.trainer-btn');
      const expectedTrainerCount = component.storeTypeOptions.filter((o) => o.trainer).length;
      expect(trainerBtns.length).toBe(expectedTrainerCount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. DOM — station detail
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOM — station detail', () => {
    it('should show no-selection message when no station is selected', () => {
      component.selectedStationId.set(null);
      fixture.detectChanges();
      const msg = fixture.nativeElement.querySelector('.no-selection');
      expect(msg?.textContent?.trim()).toBe('Select a station above.');
    });

    it('should not show no-selection message when a station is selected', () => {
      sms.stations.set([makeStation({ id: 3 })]);
      component.selectedStationId.set(3);
      fixture.detectChanges();
      const msg = fixture.nativeElement.querySelector('.no-selection');
      expect(msg).toBeNull();
    });

    it('should show station detail when a station with a store is selected', () => {
      sms.stations.set([makeStation({ id: 3, storeType: 'GBU12', storeStatus: 'IDLE' })]);
      component.selectedStationId.set(3);
      fixture.detectChanges();
      const detail = fixture.nativeElement.querySelector('.station-detail');
      expect(detail).toBeTruthy();
    });

    it('should not show station detail when selected station has no store', () => {
      sms.stations.set([makeStation({ id: 3, storeType: '' })]);
      component.selectedStationId.set(3);
      fixture.detectChanges();
      const detail = fixture.nativeElement.querySelector('.station-detail');
      expect(detail).toBeNull();
    });

    it('should display store type in the detail view', () => {
      sms.stations.set([makeStation({ id: 3, storeType: 'GBU38', storeStatus: 'IDLE' })]);
      component.selectedStationId.set(3);
      fixture.detectChanges();
      const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.detail-row');
      const storeRow = Array.from(rows).find((r) => r.textContent?.includes('Store:'));
      expect(storeRow?.textContent).toContain('GBU38');
    });

    it('should show verify banner when verifyState is in-progress', () => {
      component.verifyState.set('in-progress');
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector('.verify-banner');
      expect(banner).toBeTruthy();
    });

    it('should not show verify banner when verifyState is idle', () => {
      component.verifyState.set('idle');
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector('.verify-banner');
      expect(banner).toBeNull();
    });
  });
});
