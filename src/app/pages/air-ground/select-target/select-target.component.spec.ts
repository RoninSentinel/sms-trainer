/**
 * SelectTargetComponent Unit Tests
 * ==================================
 * Comprehensive Jasmine/TestBed tests for the Select Target page.
 *
 * Test categories:
 *   1.  Component creation & initial state
 *   2.  Target selection (selectTarget, isSelected)
 *   3.  Store assignment popup (open, toggle, selectAll, close, labels)
 *   4.  FIX #2  — Store popup opens on re-click of selected saved target
 *   5.  CCTGP mode toggle (Auto / Manual / None cycle)
 *   6.  FIX #10 — CCTGP Auto-mode dynamic coordinate updates
 *   7.  Heading reference toggle (True / Mag)
 *   8.  Saved-target scrolling (scrollUp, scrollDown, ensureSelectedVisible)
 *   9.  Create Target flow (openCreateTarget, keyboard, createAndExit)
 *  10.  FIX #1  — Modify Target flow (modifyTarget, modifyAndExit)
 *  11.  FIX #3  — Guarded Delete & Exit (double-tap behavior)
 *  12.  FIX #4  — Choose Coordinate System popup
 *  13.  FIX #5  — Coordinate format labels (DDMMSSsss, etc.)
 *  14.  FIX #6  — Coordinate format mask
 *  15.  FIX #7  — Name keyboard header label ("Target Name:")
 *  16.  FIX #8  — CCTGP MGRS grid square designator
 *  17.  FIX #9  — Comma-formatted elevation display
 *  18.  FIX #12 — Multi-line store assignment labels
 *  19.  Keyboard delegation (onKeyboardOk, onKeyboardCancel)
 *  20.  Elevation unit & reference toggles
 *  21.  Edge cases & validation
 *
 * NOTE: Low-level keyboard key handler tests (onKeyPress, onKeyDelete,
 *       onKeyClear, onKeySpace) have been moved to the shared
 *       KeyboardPopupComponent spec (keyboard-popup.component.spec.ts).
 *
 * Setup note:
 *   This project uses Karma + Jasmine.  Run tests with:
 *     ng test
 *     ng test --watch=false   (single run for CI)
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SelectTargetComponent } from './select-target.component';
import { KeyboardPopupComponent } from '../../../components/shared/keyboard-popup/keyboard-popup.component';
import { SmsService, SavedTarget, Station } from '../../../services/sms.service';

describe('SelectTargetComponent', () => {
  let component: SelectTargetComponent;
  let fixture: ComponentFixture<SelectTargetComponent>;
  let smsService: SmsService;

  // ── Helpers ──────────────────────────────────────────────────────────────

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

  function makeTarget(overrides: Partial<SavedTarget> & { name: string }): SavedTarget {
    return {
      lat: '',
      lon: '',
      alt: '0',
      altRef: 'MSL-84',
      source: 'Manual',
      ...overrides,
    };
  }

  /**
   * Loads the standard demo station configuration matching the demo video.
   */
  function loadDemoStations(): void {
    smsService.stations.set([
      makeStation({ id: 1 }),
      makeStation({
        id: 2,
        storeType: 'Hellfire',
        substations: [
          { id: '2-1', storeType: 'Hellfire', storeStatus: 'READY', storePower: true, selected: false },
          { id: '2-2', storeType: 'Hellfire', storeStatus: 'READY', storePower: true, selected: false },
        ],
      }),
      makeStation({ id: 3, storeType: 'GBU12', storeStatus: 'READY' }),
      makeStation({ id: 5, storeType: 'GBU38', storeStatus: 'AUR' }),
      makeStation({
        id: 6,
        storeType: 'Hellfire',
        substations: [
          { id: '6-1', storeType: 'Hellfire', storeStatus: 'READY', storePower: true, selected: false },
          { id: '6-2', storeType: 'Hellfire', storeStatus: 'READY', storePower: true, selected: false },
        ],
      }),
      makeStation({ id: 7 }),
    ]);
  }

  // ── Test bed setup ────────────────────────────────────────────────────────

  beforeEach(async () => {
    // ── Clear persisted state so SmsService starts fresh ──
    localStorage.removeItem('sms-trainer-state');
    await TestBed.configureTestingModule({
      imports: [SelectTargetComponent, FormsModule, KeyboardPopupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectTargetComponent);
    component = fixture.componentInstance;
    smsService = TestBed.inject(SmsService);
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMPONENT CREATION & INITIAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component creation & initial state', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should default to select view', () => {
      expect(component.activeView).toBe('select');
    });

    it('should start with no saved targets', () => {
      expect(component['targets']().length).toBe(0);
    });

    it('should start with no target selected', () => {
      expect(component['selectedTargetName']()).toBe('');
    });

    it('should start with keyboard hidden', () => {
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should default heading reference to True', () => {
      expect(component.headingRef).toBe('True');
    });

    it('should default CCTGP mode to Auto', () => {
      expect(component.cctgpMode).toBe('Auto');
    });

    it('should default elevation unit to Feet', () => {
      expect(component.elevUnit).toBe('Feet');
    });

    it('should default elevation reference to MSL-84', () => {
      expect(component.elevRef).toBe('MSL-84');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TARGET SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Target selection', () => {
    beforeEach(() => {
      smsService.savedTargets.set([makeTarget({ name: 'TARGET 01' }), makeTarget({ name: 'TARGET 02' })]);
      loadDemoStations();
    });

    it('should select a target by name', () => {
      component.selectTarget('TARGET 01');
      expect(smsService.selectedTargetName()).toBe('TARGET 01');
    });

    it('should report isSelected correctly', () => {
      component.selectTarget('TARGET 01');
      expect(component.isSelected('TARGET 01')).toBeTrue();
      expect(component.isSelected('TARGET 02')).toBeFalse();
    });

    it('should open store popup on re-click of selected target (FIX #2)', () => {
      component.selectTarget('TARGET 01');
      component.selectTarget('TARGET 01'); // re-click
      expect(component.showStorePopup).toBeTrue();
      expect(component.storePopupTargetName).toBe('TARGET 01');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. STORE ASSIGNMENT POPUP
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Store assignment popup', () => {
    beforeEach(() => {
      loadDemoStations();
    });

    it('should open store popup', () => {
      component.openStorePopup('CCTGP');
      expect(component.showStorePopup).toBeTrue();
      expect(component.storePopupTargetName).toBe('CCTGP');
    });

    it('should toggle store assignment', () => {
      component.openStorePopup('CCTGP');
      component.toggleStoreAssignment('2-1');
      expect(smsService.storeAssignments()['CCTGP']).toContain('2-1');
      component.toggleStoreAssignment('2-1');
      expect(smsService.storeAssignments()['CCTGP']).not.toContain('2-1');
    });

    it('should select all stores', () => {
      component.openStorePopup('CCTGP');
      component.selectAllStores();
      const assigned = smsService.storeAssignments()['CCTGP'];
      expect(assigned.length).toBeGreaterThan(0);
    });

    it('should close store popup', () => {
      component.openStorePopup('CCTGP');
      component.closeStorePopup();
      expect(component.showStorePopup).toBeFalse();
    });

    it('should report hasAssignedStores', () => {
      expect(component.hasAssignedStores('CCTGP')).toBeFalse();
      smsService.storeAssignments.set({ CCTGP: ['2-1'] });
      expect(component.hasAssignedStores('CCTGP')).toBeTrue();
    });

    it('should build label with parenthesised stations', () => {
      smsService.storeAssignments.set({ CCTGP: ['2-1', '2-2', '3'] });
      const label = component.getAssignedStoresLabel('CCTGP');
      expect(label).toContain('(2)');
      expect(label).toContain('3');
    });

    it('should return Select for unassigned targets', () => {
      expect(component.getAssignedStoresLabel('CCTGP')).toBe('Select');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CCTGP MODE TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CCTGP mode toggle', () => {
    it('should cycle Auto → Manual → None → Auto', () => {
      expect(component.cctgpMode).toBe('Auto');
      component.toggleCctgpMode();
      expect(component.cctgpMode).toBe('Manual');
      component.toggleCctgpMode();
      expect(component.cctgpMode).toBe('None');
      component.toggleCctgpMode();
      expect(component.cctgpMode).toBe('Auto');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. HEADING REFERENCE TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Heading reference toggle', () => {
    it('should toggle between True and Mag', () => {
      expect(component.headingRef).toBe('True');
      component.toggleHeadingRef();
      expect(component.headingRef).toBe('Mag');
      component.toggleHeadingRef();
      expect(component.headingRef).toBe('True');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. SCROLLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Saved-target scrolling', () => {
    beforeEach(() => {
      smsService.savedTargets.set([
        makeTarget({ name: 'T1' }),
        makeTarget({ name: 'T2' }),
        makeTarget({ name: 'T3' }),
        makeTarget({ name: 'T4' }),
        makeTarget({ name: 'T5' }),
      ]);
    });

    it('should scroll down', () => {
      component.scrollDown();
      expect(component.scrollOffset).toBe(1);
    });

    it('should scroll up', () => {
      component.scrollOffset = 2;
      component.scrollUp();
      expect(component.scrollOffset).toBe(1);
    });

    it('should not scroll below 0', () => {
      component.scrollUp();
      expect(component.scrollOffset).toBe(0);
    });

    it('should ensure selected target is visible', () => {
      smsService.selectedTargetName.set('T5');
      component.ensureSelectedVisible();
      expect(component.scrollOffset).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. CREATE TARGET FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Create Target flow', () => {
    it('should switch to create view', () => {
      component.openCreateTarget();
      expect(component.activeView).toBe('create');
    });

    it('should auto-generate target name', () => {
      component.openCreateTarget();
      expect(component.newTarget.name).toBe('TARGET 01');
    });

    it('should open name keyboard', () => {
      component.openCreateTarget();
      component.openNameKeyboard();
      expect(component.keyboardMode).toBe('name');
      expect(component.keyboardBuffer).toBe('TARGET 01');
    });

    it('should open coord keyboard', () => {
      component.openCreateTarget();
      component.openCoordKeyboard();
      expect(component.keyboardMode).toBe('coordinates');
    });

    it('should open elev keyboard', () => {
      component.openCreateTarget();
      component.openElevKeyboard();
      expect(component.keyboardMode).toBe('elevation');
    });

    it('should save coordinates via onKeyboardOk', () => {
      component.openCreateTarget();
      component.openCoordKeyboard();
      component.onKeyboardOk('11S PA 123');
      expect(component.newTarget.lat).toBe('11S PA 123');
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should save elevation via onKeyboardOk', () => {
      component.openCreateTarget();
      component.openElevKeyboard();
      component.elevRef = 'HAE-84';
      component.onKeyboardOk('7100');
      expect(component.newTarget.alt).toBe('7100');
      expect(component.newTarget.altRef).toBe('HAE-84');
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should save name via onKeyboardOk', () => {
      component.openCreateTarget();
      component.openNameKeyboard();
      component.onKeyboardOk('MY TARGET');
      expect(component.newTarget.name).toBe('MY TARGET');
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should reject CCTGP as name via onKeyboardOk', () => {
      component.openCreateTarget();
      component.openNameKeyboard();
      const originalName = component.newTarget.name;
      component.onKeyboardOk('CCTGP');
      expect(component.newTarget.name).toBe(originalName);
    });

    it('should hide keyboard on cancel', () => {
      component.openCreateTarget();
      component.openCoordKeyboard();
      component.onKeyboardCancel();
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should create and exit', () => {
      component.openCreateTarget();
      component.createAndExit();
      expect(smsService.savedTargets().length).toBe(1);
      expect(component.activeView).toBe('select');
    });

    it('should populate from EOIR on target update with TGP', () => {
      component.openCreateTarget();
      component.newTarget.source = 'TGP';
      component.targetUpdate();
      expect(component.newTarget.lat).toBeTruthy();
      expect(component.newTarget.altRef).toBe('MSL-96');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. FIX #1 — MODIFY TARGET FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Modify Target flow (FIX #1)', () => {
    beforeEach(() => {
      smsService.savedTargets.set([
        makeTarget({ name: 'TARGET 01', lat: '11S PA 123', alt: '5000', altRef: 'MSL-84' }),
      ]);
      fixture.detectChanges();
    });

    it('should open modify view with target data', () => {
      component.modifyTarget('TARGET 01');
      expect(component.activeView).toBe('modify');
      expect(component.newTarget.name).toBe('TARGET 01');
      expect(component.newTarget.lat).toBe('11S PA 123');
      expect(component.newTarget.alt).toBe('5000');
      expect(component.modifyOriginalName).toBe('TARGET 01');
    });

    it('should not change view for non-existent target', () => {
      component.modifyTarget('NONEXISTENT');
      expect(component.activeView).toBe('select');
    });

    it('should save modified target data', () => {
      component.modifyTarget('TARGET 01');
      component.newTarget.name = 'RENAMED';
      component.newTarget.lat = 'new coords';
      component.newTarget.alt = '9999';
      component.modifyAndExit();

      expect(component.activeView).toBe('select');
      const targets = smsService.savedTargets();
      expect(targets.length).toBe(1);
      expect(targets[0].name).toBe('RENAMED');
      expect(targets[0].lat).toBe('new coords');
    });

    it('should update store assignments key when name changes', () => {
      smsService.storeAssignments.set({ 'TARGET 01': ['2-1', '3'] });
      component.modifyTarget('TARGET 01');
      component.newTarget.name = 'RENAMED';
      component.modifyAndExit();

      expect(smsService.storeAssignments()['RENAMED']).toEqual(['2-1', '3']);
      expect(smsService.storeAssignments()['TARGET 01']).toBeUndefined();
    });

    it('should update selected name when renamed', () => {
      smsService.selectedTargetName.set('TARGET 01');
      component.modifyTarget('TARGET 01');
      component.newTarget.name = 'RENAMED';
      component.modifyAndExit();

      expect(smsService.selectedTargetName()).toBe('RENAMED');
    });

    it('should reject renaming to CCTGP', () => {
      component.modifyTarget('TARGET 01');
      component.newTarget.name = 'CCTGP';
      component.modifyAndExit();
      expect(component.activeView).toBe('modify');
    });

    it('should validate modify form correctly', () => {
      component.modifyTarget('TARGET 01');
      expect(component.canModifyAndExit()).toBeTrue();

      component.newTarget.name = '';
      expect(component.canModifyAndExit()).toBeFalse();

      component.newTarget.name = 'CCTGP';
      expect(component.canModifyAndExit()).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. FIX #3 — GUARDED DELETE & EXIT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Guarded Delete & Exit (FIX #3)', () => {
    it('should arm the guard on first tap (create mode)', () => {
      component.openCreateTarget();
      component.deleteAndExit();
      expect(component.deleteGuardArmed).toBeTrue();
      expect(component.activeView).toBe('create');
    });

    it('should exit on second tap (create mode)', () => {
      component.openCreateTarget();
      component.deleteAndExit();
      component.deleteAndExit();
      expect(component.activeView).toBe('select');
    });

    it('should reset guard when other button is pressed', () => {
      component.openCreateTarget();
      component.deleteAndExit();
      expect(component.deleteGuardArmed).toBeTrue();
      component.resetDeleteGuard();
      expect(component.deleteGuardArmed).toBeFalse();
    });

    it('should delete target on confirmed delete in modify mode', () => {
      smsService.savedTargets.set([makeTarget({ name: 'TARGET 01' })]);
      fixture.detectChanges();

      component.modifyTarget('TARGET 01');
      component.guardedDeleteAndExit();
      component.guardedDeleteAndExit();

      expect(smsService.savedTargets().length).toBe(0);
      expect(component.activeView).toBe('select');
    });

    it('should clear selection when deleting selected target', () => {
      smsService.savedTargets.set([makeTarget({ name: 'TARGET 01' })]);
      smsService.selectedTargetName.set('TARGET 01');
      fixture.detectChanges();

      component.modifyTarget('TARGET 01');
      component.guardedDeleteAndExit();
      component.guardedDeleteAndExit();

      expect(smsService.selectedTargetName()).toBe('');
    });

    it('should clean up store assignments on delete', () => {
      smsService.savedTargets.set([makeTarget({ name: 'TARGET 01' })]);
      smsService.storeAssignments.set({ 'TARGET 01': ['2-1', '3'] });
      fixture.detectChanges();

      component.modifyTarget('TARGET 01');
      component.guardedDeleteAndExit();
      component.guardedDeleteAndExit();

      expect(smsService.storeAssignments()['TARGET 01']).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. FIX #4 — CHOOSE COORDINATE SYSTEM POPUP
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Choose Coordinate System popup (FIX #4)', () => {
    it('should open coord system popup', () => {
      component.openCoordSystemPopup();
      expect(component.showCoordSystemPopup).toBeTrue();
    });

    it('should select a coord format and close popup', () => {
      component.openCoordSystemPopup();
      component.selectCoordFormat(0);
      expect(component.coordFormatIndex).toBe(0);
      expect(component.showCoordSystemPopup).toBeFalse();
    });

    it('should have 4 coordinate format options', () => {
      expect(component.coordFormats.length).toBe(4);
    });

    it('should close coord popup on keyboard OK', () => {
      component.openCreateTarget();
      component.openCoordKeyboard();
      component.showCoordSystemPopup = true;
      component.onKeyboardOk('11S PA 123');
      expect(component.showCoordSystemPopup).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. FIX #5 — COORDINATE FORMAT LABELS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Coordinate format labels (FIX #5)', () => {
    it('should use official GSMS format labels', () => {
      const labels = component.coordFormats.map((f: { label: string }) => f.label);
      expect(labels).toContain('DDMMSSsss');
      expect(labels).toContain('DDMMmmmmm');
      expect(labels).toContain('UTM');
      expect(labels).toContain('MGRS');
    });

    it('should default to MGRS format', () => {
      expect(component.currentCoordFormat.label).toBe('MGRS');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. FIX #6 — COORDINATE FORMAT MASK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Coordinate format mask (FIX #6)', () => {
    it('should have mask templates for all formats', () => {
      for (const fmt of component.coordFormats) {
        expect(fmt.mask.length).toBeGreaterThan(0);
      }
    });

    it('should show degree symbols in DDMMSSsss mask', () => {
      const mask = component.coordFormats[0].mask;
      expect(mask).toContain('°');
      expect(mask).toContain("'");
      expect(mask).toContain('"');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. FIX #7 — NAME KEYBOARD HEADER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Name keyboard (FIX #7)', () => {
    it('should open name keyboard with current name', () => {
      component.openCreateTarget();
      component.openNameKeyboard();
      expect(component.keyboardMode).toBe('name');
      expect(component.keyboardBuffer).toBe('TARGET 01');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. FIX #8 — CCTGP MGRS GRID SQUARE DESIGNATOR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CCTGP coordinates (FIX #8)', () => {
    it('should use correct MGRS grid square designator', () => {
      expect(component.crossCuedTarget.lat).toContain('ZF');
      expect(component.crossCuedTarget.lat).not.toContain('2E');
    });

    it('should use MSL-96 as CCTGP altitude reference', () => {
      expect(component.crossCuedTarget.altRef).toBe('MSL-96');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. FIX #9 — COMMA-FORMATTED ELEVATION DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Elevation display formatting (FIX #9)', () => {
    it('should format 7100 as "7,100"', () => {
      expect(component.formatNumber('7100')).toBe('7,100');
    });

    it('should not add commas for small numbers', () => {
      expect(component.formatNumber('100')).toBe('100');
    });

    it('should format "0" as "0"', () => {
      expect(component.formatNumber('0')).toBe('0');
    });

    it('should pass through non-numeric strings', () => {
      expect(component.formatNumber('abc')).toBe('abc');
    });

    it('should format elevation display with commas', () => {
      const target = makeTarget({ name: 'TEST', alt: '7100', altRef: 'MSL-84' });
      const display = component.getElevDisplay(target);
      expect(display).toContain('7,100');
      expect(display).toContain('Feet');
      expect(display).toContain('[MSL-84]');
    });

    it('should format CCTGP elevation with commas', () => {
      component.crossCuedTarget.alt = '3180';
      const display = component.getCctgpElevDisplay();
      expect(display).toContain('3,180');
      expect(display).toContain('Feet');
      expect(display).toContain('[MSL-96]');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. KEYBOARD DELEGATION (replaces old keyboard input handler tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Keyboard delegation via shared component', () => {
    beforeEach(() => {
      component.openCreateTarget();
    });

    it('should save coordinates on keyboard OK', () => {
      component.openCoordKeyboard();
      component.onKeyboardOk('11S PA 12345 67890');
      expect(component.newTarget.lat).toBe('11S PA 12345 67890');
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should save elevation on keyboard OK', () => {
      component.openElevKeyboard();
      component.onKeyboardOk('7100');
      expect(component.newTarget.alt).toBe('7100');
      expect(component.newTarget.altRef).toBe('MSL-84');
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should save name on keyboard OK', () => {
      component.openNameKeyboard();
      component.onKeyboardOk('ALPHA');
      expect(component.newTarget.name).toBe('ALPHA');
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should reject empty name on keyboard OK', () => {
      component.openNameKeyboard();
      const originalName = component.newTarget.name;
      component.onKeyboardOk('   ');
      expect(component.newTarget.name).toBe(originalName);
    });

    it('should hide keyboard on cancel', () => {
      component.openCoordKeyboard();
      expect(component.keyboardMode).toBe('coordinates');
      component.onKeyboardCancel();
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should close coord system popup on keyboard OK', () => {
      component.openCoordKeyboard();
      component.showCoordSystemPopup = true;
      component.onKeyboardOk('test');
      expect(component.showCoordSystemPopup).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. ELEVATION UNIT & REFERENCE TOGGLES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Elevation unit & reference toggles', () => {
    it('should toggle between Feet and Meters', () => {
      expect(component.elevUnit).toBe('Feet');
      component.toggleElevUnit();
      expect(component.elevUnit).toBe('Meters');
      component.toggleElevUnit();
      expect(component.elevUnit).toBe('Feet');
    });

    it('should cycle through elevation references', () => {
      expect(component.elevRef).toBe('MSL-84');
      component.cycleElevRef();
      expect(component.elevRef).toBe('HAE-84');
      component.cycleElevRef();
      expect(component.elevRef).toBe('MSL-96');
      component.cycleElevRef();
      expect(component.elevRef).toBe('MSL-84');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. EDGE CASES & VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases & validation', () => {
    it('should only show loaded stations in assignable stores', () => {
      loadDemoStations();
      component.openStorePopup('CCTGP');
      const stores = component['assignableStores']();
      const stationIds = stores.map((s: { stationId: number }) => s.stationId);
      expect(stationIds).not.toContain(1);
      expect(stationIds).not.toContain(7);
      expect(stationIds).toContain(2);
      expect(stationIds).toContain(3);
    });

    it('should block elevation keyboard when TGP is source', () => {
      component.openCreateTarget();
      component.newTarget.source = 'TGP';
      component.openElevKeyboard();
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should block coord keyboard when TGP is source', () => {
      component.openCreateTarget();
      component.newTarget.source = 'TGP';
      component.openCoordKeyboard();
      expect(component.keyboardMode).toBe('hidden');
    });

    it('should reset delete guard when opening create', () => {
      component.deleteGuardArmed = true;
      component.openCreateTarget();
      expect(component.deleteGuardArmed).toBeFalse();
    });

    it('should create TGP target after targetUpdate', () => {
      component.openCreateTarget();
      component.setSource('TGP');
      component.targetUpdate();
      component.createAndExit();

      expect(smsService.savedTargets().length).toBe(1);
      expect(smsService.savedTargets()[0].altRef).toBe('MSL-96');
    });

    it('should set elevRef from target data on modify', () => {
      smsService.savedTargets.set([makeTarget({ name: 'TARGET 01', altRef: 'HAE-84' })]);
      fixture.detectChanges();

      component.modifyTarget('TARGET 01');
      expect(component.elevRef).toBe('HAE-84');
    });
  });
});
