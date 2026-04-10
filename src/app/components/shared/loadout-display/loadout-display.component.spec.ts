import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadoutDisplayComponent } from './loadout-display.component';
import { SmsService, Station, SubStation } from '../../../services/sms.service';
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

/** Builds a minimal SubStation for testing. */
function makeSub(overrides: Partial<SubStation> & { id: string }): SubStation {
  return {
    storeType: 'Hellfire',
    storeStatus: 'IDLE',
    storePower: false,
    selected: false,
    ...overrides,
  } as SubStation;
}

describe('LoadoutDisplayComponent', () => {
  let component: LoadoutDisplayComponent;
  let fixture: ComponentFixture<LoadoutDisplayComponent>;
  let sms: SmsService;

  beforeEach(async () => {
    const mockPersistence = jasmine.createSpyObj('StatePersistenceService', ['save', 'load', 'clear']);
    mockPersistence.load.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [LoadoutDisplayComponent],
      providers: [{ provide: StatePersistenceService, useValue: mockPersistence }],
    }).compileComponents();

    sms = TestBed.inject(SmsService);
    fixture = TestBed.createComponent(LoadoutDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMPONENT CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one station-column per station', () => {
    sms.stations.set([
      makeStation({ id: 2, storeType: 'GBU12' }),
      makeStation({ id: 3, storeType: '' }),
      makeStation({ id: 5, storeType: 'Hellfire', substations: [makeSub({ id: '5-1' }), makeSub({ id: '5-2' })] }),
    ]);
    fixture.detectChanges();

    const columns = fixture.nativeElement.querySelectorAll('.station-column');
    expect(columns.length).toBe(3);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. STORE ICON RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('store icon rendering', () => {
    it('should render an img with GBU.png for a GBU12 station', () => {
      sms.stations.set([makeStation({ id: 2, storeType: 'GBU12' })]);
      fixture.detectChanges();

      const img: HTMLImageElement = fixture.nativeElement.querySelector('.store-icon-img');
      expect(img).toBeTruthy();
      expect(img.src).toContain('GBU.png');
      expect(img.alt).toBe('GBU12');
      expect(img.classList).toContain('family-gbu');
    });

    it('should render an img with hellfire.png for a Hellfire station', () => {
      sms.stations.set([
        makeStation({ id: 2, storeType: 'Hellfire', substations: [makeSub({ id: '2-1' })] }),
      ]);
      fixture.detectChanges();

      const img: HTMLImageElement = fixture.nativeElement.querySelector('.store-icon-img');
      expect(img).toBeTruthy();
      expect(img.src).toContain('hellfire.png');
      expect(img.classList).toContain('family-hellfire');
    });

    it('should render a text fallback for store types without an icon mapping', () => {
      sms.stations.set([makeStation({ id: 2, storeType: 'AWM' })]);
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('.store-icon-img');
      expect(img).toBeNull();

      const storeIcon: HTMLElement = fixture.nativeElement.querySelector('.store-icon');
      expect(storeIcon.textContent?.trim()).toBe('AWM');
      expect(storeIcon.classList).not.toContain('empty');
    });

    it('should render an empty placeholder when storeType is unset', () => {
      sms.stations.set([makeStation({ id: 2, storeType: '' })]);
      fixture.detectChanges();

      const storeIcon: HTMLElement = fixture.nativeElement.querySelector('.store-icon');
      expect(storeIcon).toBeTruthy();
      expect(storeIcon.classList).toContain('empty');
      expect(fixture.nativeElement.querySelector('.store-icon-img')).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. STATUS ROW RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('status row rendering', () => {
    it('should render a single store-info-box for a non-Hellfire station', () => {
      sms.stations.set([makeStation({ id: 2, storeType: 'GBU12', storeStatus: 'READY', storePower: true })]);
      fixture.detectChanges();

      const col = fixture.nativeElement.querySelector('.station-column');
      expect(col.querySelectorAll('.store-info-box').length).toBe(1);
      expect(col.querySelectorAll('.sub-info-box').length).toBe(0);
      expect(col.querySelector('.sib-label').textContent.trim()).toBe('GBU12');
      expect(col.querySelector('.sib-status').textContent.trim()).toBe('READY');
    });

    it('should render one sub-info-box per substation on a Hellfire station', () => {
      sms.stations.set([
        makeStation({
          id: 2,
          storeType: 'Hellfire',
          substations: [
            makeSub({ id: '2-1', storeType: 'Hellfire', storeStatus: 'READY', storePower: true }),
            makeSub({ id: '2-2', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: false }),
          ],
        }),
      ]);
      fixture.detectChanges();

      const col = fixture.nativeElement.querySelector('.station-column');
      const subBoxes = col.querySelectorAll('.sub-info-box');
      expect(subBoxes.length).toBe(2);
      expect(col.querySelectorAll('.store-info-box').length).toBe(0);
    });

    it('should render no status row when storeType is unset', () => {
      sms.stations.set([makeStation({ id: 2, storeType: '' })]);
      fixture.detectChanges();

      const col = fixture.nativeElement.querySelector('.station-column');
      expect(col.querySelectorAll('.store-info-box').length).toBe(0);
      expect(col.querySelectorAll('.sub-info-box').length).toBe(0);
    });

    it('should toggle .powered on the power indicator based on storePower', () => {
      sms.stations.set([
        makeStation({ id: 2, storeType: 'GBU12', storePower: true }),
        makeStation({ id: 3, storeType: 'GBU12', storePower: false }),
      ]);
      fixture.detectChanges();

      const columns = fixture.nativeElement.querySelectorAll('.station-column');
      expect(columns[0].querySelector('.sib-power').classList).toContain('powered');
      expect(columns[1].querySelector('.sib-power').classList).not.toContain('powered');
    });

    it('should show -- placeholder when storeStatus is empty', () => {
      sms.stations.set([makeStation({ id: 2, storeType: 'GBU12', storeStatus: '' as never })]);
      fixture.detectChanges();

      const status = fixture.nativeElement.querySelector('.sib-status');
      expect(status.textContent.trim()).toBe('--');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SELECTION BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('selection behavior', () => {
    it('should apply .selected to the station matching activeStationId', () => {
      sms.stations.set([
        makeStation({ id: 2, storeType: 'GBU12' }),
        makeStation({ id: 3, storeType: 'GBU12' }),
      ]);
      sms.selectedStationId.set(3);
      fixture.detectChanges();

      const columns = fixture.nativeElement.querySelectorAll('.station-column');
      expect(columns[0].classList).not.toContain('selected');
      expect(columns[1].classList).toContain('selected');
    });

    it('should update selectedStationId when a station-column is clicked', () => {
      sms.stations.set([
        makeStation({ id: 2, storeType: 'GBU12' }),
        makeStation({ id: 5, storeType: 'GBU12' }),
      ]);
      sms.selectedStationId.set(2);
      fixture.detectChanges();

      const columns = fixture.nativeElement.querySelectorAll('.station-column');
      (columns[1] as HTMLElement).click();
      fixture.detectChanges();

      expect(sms.selectedStationId()).toBe(5);
      expect(columns[1].classList).toContain('selected');
      expect(columns[0].classList).not.toContain('selected');
    });

    it('should update selectedStationId on Enter keypress', () => {
      sms.stations.set([makeStation({ id: 2, storeType: 'GBU12' }), makeStation({ id: 5, storeType: 'GBU12' })]);
      sms.selectedStationId.set(2);
      fixture.detectChanges();

      const columns = fixture.nativeElement.querySelectorAll('.station-column');
      columns[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();

      expect(sms.selectedStationId()).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. getStoreIcon()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getStoreIcon()', () => {
    it('should return the GBU icon path for all GBU variants', () => {
      expect(component.getStoreIcon('GBU12')).toContain('GBU.png');
      expect(component.getStoreIcon('GBU38')).toContain('GBU.png');
      expect(component.getStoreIcon('GBU48')).toContain('GBU.png');
      expect(component.getStoreIcon('GBU49')).toContain('GBU.png');
      expect(component.getStoreIcon('GBU54')).toContain('GBU.png');
    });

    it('should return the hellfire icon path for Hellfire', () => {
      expect(component.getStoreIcon('Hellfire')).toContain('hellfire.png');
    });

    it('should return null for store types without a mapping', () => {
      expect(component.getStoreIcon('AWM')).toBeNull();
      expect(component.getStoreIcon('M36')).toBeNull();
      expect(component.getStoreIcon('' as never)).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. getStoreFamily()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getStoreFamily()', () => {
    it('should return "gbu" for all GBU variants', () => {
      expect(component.getStoreFamily('GBU12')).toBe('gbu');
      expect(component.getStoreFamily('GBU38')).toBe('gbu');
      expect(component.getStoreFamily('GBU54')).toBe('gbu');
    });

    it('should return "hellfire" for Hellfire', () => {
      expect(component.getStoreFamily('Hellfire')).toBe('hellfire');
    });

    it('should return "other" for unrelated store types', () => {
      expect(component.getStoreFamily('AWM')).toBe('other');
      expect(component.getStoreFamily('M36')).toBe('other');
    });
  });
});
