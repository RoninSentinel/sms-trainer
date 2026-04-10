/**
 * KeyboardPopupComponent Unit Tests
 * ==================================
 * Tests for the shared on-screen QWERTY keyboard component.
 *
 * Test categories:
 *   1. Component creation & initial state
 *   2. Buffer initialisation from input
 *   3. Key press handlers (press, delete, clear, space)
 *   4. OK and Cancel event emission
 *   5. Header toggle event emission (coordFormat, elevUnit, elevRef)
 *   6. Key disabled state (elevation mode)
 *   7. Choose Coordinate System popup (Figure 1-89)
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyboardPopupComponent } from './keyboard-popup.component';

describe('KeyboardPopupComponent', () => {
  let component: KeyboardPopupComponent;
  let fixture: ComponentFixture<KeyboardPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyboardPopupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyboardPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMPONENT CREATION & INITIAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component creation & initial state', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should default to name mode', () => {
      expect(component.mode).toBe('name');
    });

    it('should start with empty buffer', () => {
      expect(component.buffer).toBe('');
    });

    it('should have 4 key rows', () => {
      expect(component.keyRows.length).toBe(4);
    });

    it('should have 10 keys in the number row', () => {
      expect(component.keyRows[0].length).toBe(10);
    });

    it('should default showCoordSystemPopup to false', () => {
      expect(component.showCoordSystemPopup).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. BUFFER INITIALISATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Buffer initialisation', () => {
    it('should populate buffer from initialValue on init', () => {
      component.initialValue = 'HELLO';
      component.ngOnInit();
      expect(component.buffer).toBe('HELLO');
    });

    it('should update buffer when initialValue input changes', () => {
      component.initialValue = 'NEW VALUE';
      component.ngOnChanges({
        initialValue: {
          currentValue: 'NEW VALUE',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      expect(component.buffer).toBe('NEW VALUE');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. KEY PRESS HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Key press handlers', () => {
    it('should append character on keyPress', () => {
      component.onKeyPress('A');
      expect(component.buffer).toBe('A');
      component.onKeyPress('B');
      expect(component.buffer).toBe('AB');
    });

    it('should delete last character', () => {
      component.buffer = 'ABC';
      component.onKeyDelete();
      expect(component.buffer).toBe('AB');
    });

    it('should not error on delete from empty buffer', () => {
      component.buffer = '';
      component.onKeyDelete();
      expect(component.buffer).toBe('');
    });

    it('should clear entire buffer', () => {
      component.buffer = 'HELLO';
      component.onKeyClear();
      expect(component.buffer).toBe('');
    });

    it('should append space', () => {
      component.buffer = 'A';
      component.onKeySpace();
      expect(component.buffer).toBe('A ');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. OK AND CANCEL EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('OK and Cancel events', () => {
    it('should emit buffer value on OK', () => {
      component.buffer = '11S PA 123';
      spyOn(component.ok, 'emit');
      component.onKeyOk();
      expect(component.ok.emit).toHaveBeenCalledWith('11S PA 123');
    });

    it('should emit cancel event', () => {
      spyOn(component.cancelled, 'emit');
      component.onKeyCancel();
      expect(component.cancelled.emit).toHaveBeenCalled();
    });

    it('should close coord system popup on OK', () => {
      component.showCoordSystemPopup = true;
      component.onKeyOk();
      expect(component.showCoordSystemPopup).toBeFalse();
    });

    it('should close coord system popup on Cancel', () => {
      component.showCoordSystemPopup = true;
      component.onKeyCancel();
      expect(component.showCoordSystemPopup).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. HEADER TOGGLE EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Header toggle events', () => {
    it('should emit elevUnitToggle', () => {
      spyOn(component.elevUnitToggle, 'emit');
      component.elevUnitToggle.emit();
      expect(component.elevUnitToggle.emit).toHaveBeenCalled();
    });

    it('should emit elevRefCycle', () => {
      spyOn(component.elevRefCycle, 'emit');
      component.elevRefCycle.emit();
      expect(component.elevRefCycle.emit).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. KEY DISABLED STATE (elevation mode)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Key disabled state', () => {
    it('should disable letter keys in elevation mode', () => {
      component.mode = 'elevation';
      expect(component.isKeyDisabled('A')).toBeTrue();
      expect(component.isKeyDisabled('Z')).toBeTrue();
      expect(component.isKeyDisabled('Q')).toBeTrue();
      expect(component.isKeyDisabled('M')).toBeTrue();
    });

    it('should enable digit keys in elevation mode', () => {
      component.mode = 'elevation';
      expect(component.isKeyDisabled('0')).toBeFalse();
      expect(component.isKeyDisabled('1')).toBeFalse();
      expect(component.isKeyDisabled('9')).toBeFalse();
    });

    it('should enable dash and period in elevation mode', () => {
      component.mode = 'elevation';
      expect(component.isKeyDisabled('-')).toBeFalse();
      expect(component.isKeyDisabled('.')).toBeFalse();
    });

    it('should not disable any keys in name mode', () => {
      component.mode = 'name';
      expect(component.isKeyDisabled('A')).toBeFalse();
      expect(component.isKeyDisabled('1')).toBeFalse();
      expect(component.isKeyDisabled('-')).toBeFalse();
    });

    it('should not disable any keys in coordinates mode', () => {
      component.mode = 'coordinates';
      expect(component.isKeyDisabled('A')).toBeFalse();
      expect(component.isKeyDisabled('Z')).toBeFalse();
      expect(component.isKeyDisabled('5')).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. CHOOSE COORDINATE SYSTEM POPUP (Figure 1-89)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Choose Coordinate System popup', () => {
    it('should have exactly 4 coordinate format options', () => {
      expect(component.coordFormats.length).toBe(4);
    });

    it('should contain DDMMSSsss, DDMMmmmmm, UTM, MGRS labels', () => {
      const labels = component.coordFormats.map((f) => f.label);
      expect(labels).toContain('DDMMSSsss');
      expect(labels).toContain('DDMMmmmmm');
      expect(labels).toContain('UTM');
      expect(labels).toContain('MGRS');
    });

    it('should open the popup on openCoordSystemPopup()', () => {
      expect(component.showCoordSystemPopup).toBeFalse();
      component.openCoordSystemPopup();
      expect(component.showCoordSystemPopup).toBeTrue();
    });

    it('should close the popup and emit format on selectCoordFormat()', () => {
      component.openCoordSystemPopup();
      spyOn(component.coordFormatCycle, 'emit');

      component.selectCoordFormat(0); // DDMMSSsss
      expect(component.showCoordSystemPopup).toBeFalse();
      expect(component.coordFormatCycle.emit).toHaveBeenCalledWith('DDMMSSsss');
    });

    it('should emit MGRS when selecting index 3', () => {
      component.openCoordSystemPopup();
      spyOn(component.coordFormatCycle, 'emit');

      component.selectCoordFormat(3);
      expect(component.coordFormatCycle.emit).toHaveBeenCalledWith('MGRS');
    });

    it('should emit UTM when selecting index 2', () => {
      component.openCoordSystemPopup();
      spyOn(component.coordFormatCycle, 'emit');

      component.selectCoordFormat(2);
      expect(component.coordFormatCycle.emit).toHaveBeenCalledWith('UTM');
    });

    it('should report correct coordFormatIndex for MGRS', () => {
      component.coordFormat = 'MGRS';
      expect(component.coordFormatIndex).toBe(3);
    });

    it('should report correct coordFormatIndex for DDMMSSsss', () => {
      component.coordFormat = 'DDMMSSsss';
      expect(component.coordFormatIndex).toBe(0);
    });

    it('should report correct coordFormatIndex for UTM', () => {
      component.coordFormat = 'UTM';
      expect(component.coordFormatIndex).toBe(2);
    });

    it('should report correct coordFormatIndex for DDMMmmmmm', () => {
      component.coordFormat = 'DDMMmmmmm';
      expect(component.coordFormatIndex).toBe(1);
    });

    it('should return -1 for unknown format', () => {
      component.coordFormat = 'UNKNOWN';
      expect(component.coordFormatIndex).toBe(-1);
    });

    it('should have non-empty mask for each format', () => {
      for (const fmt of component.coordFormats) {
        expect(fmt.mask.length).toBeGreaterThan(0);
      }
    });

    it('should have degree symbols in DDMMSSsss mask', () => {
      const mask = component.coordFormats[0].mask;
      expect(mask).toContain('\u00B0');
      expect(mask).toContain("'");
      expect(mask).toContain('"');
    });
  });
});
