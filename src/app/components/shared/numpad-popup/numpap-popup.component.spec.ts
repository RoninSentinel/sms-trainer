/**
 * NumpadPopupComponent Unit Tests
 * ================================
 * Comprehensive Jasmine/TestBed tests for the shared on-screen numpad popup.
 *
 * Test categories:
 *   1.  Component creation & initial state
 *   2.  Buffer initialisation from currentValue
 *   3.  Digit press and buffer manipulation
 *   4.  Backspace and Clear
 *   5.  OK — emits confirmed with valid buffer
 *   6.  CANCEL — EMITS CONFIRMED WITH ORIGINAL VALUE
 *   7.  Key validation: PRF range [1111, 1788]
 *   8.  Key validation: small range [20, 90]
 *   9.  Key validation: negative range [-100, 100]
 *  10.  Key validation: decimal range [0, 99.9]
 *  11.  OK button enabled/disabled
 *  12.  Negative toggle
 *  13.  Decimal point
 *  14.  Edge cases
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NumpadPopupComponent } from './numpad-popup.component';

describe('NumpadPopupComponent', () => {
  let component: NumpadPopupComponent;
  let fixture: ComponentFixture<NumpadPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumpadPopupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NumpadPopupComponent);
    component = fixture.componentInstance;
  });

  /**
   * Helper: configures the component with a range and optional flags,
   * triggers change detection, and returns the component for chaining.
   */
  function configure(opts: {
    min: number;
    max: number;
    currentValue?: string | number;
    allowNegative?: boolean;
    allowDecimal?: boolean;
  }): void {
    component.min = opts.min;
    component.max = opts.max;
    component.currentValue = opts.currentValue ?? '';
    component.allowNegative = opts.allowNegative ?? false;
    component.allowDecimal = opts.allowDecimal ?? false;
    fixture.detectChanges(); // triggers ngOnInit
  }

  /**
   * Helper: returns an array of enabled digit characters (0-9) given
   * the current component state.  Returns them in numeric order.
   */
  function enabledDigits(): string[] {
    return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].filter((d) => component.isDigitEnabled(d));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMPONENT CREATION & INITIAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component creation', () => {
    it('should create the component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should default to 0 buffer even with value', () => {
      component.currentValue = '15';
      fixture.detectChanges();
      expect(component.buffer).toBe('0');
    });

    it('should have default min=0 and max=9999', () => {
      expect(component.min).toBe(0);
      expect(component.max).toBe(9999);
    });

    it('should default allowNegative and allowDecimal to false', () => {
      expect(component.allowNegative).toBeFalse();
      expect(component.allowDecimal).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. BUFFER INITIALISATION FROM currentValue
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Buffer initialisation', () => {
    it('should reset buffer to 0 when currentValue input changes', () => {
      component.currentValue = '100';
      fixture.detectChanges();
      expect(component.buffer).toBe('0');

      component.currentValue = '200';
      component.ngOnChanges({
        currentValue: {
          currentValue: '200',
          previousValue: '100',
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      expect(component.buffer).toBe('0');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DIGIT PRESS AND BUFFER MANIPULATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Digit press', () => {
    it('should append digit to buffer when enabled', () => {
      configure({ min: 0, max: 9999 });
      component.buffer = '';
      component.press('5');
      expect(component.buffer).toBe('5');
      component.press('3');
      expect(component.buffer).toBe('53');
    });

    it('should not append digit when disabled', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '';
      component.press('7'); // 7 cannot lead to [1111,1788]
      expect(component.buffer).toBe('');
    });

    it('should build a full PRF code digit by digit', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '';
      component.press('1');
      component.press('6');
      component.press('8');
      component.press('8');
      expect(component.buffer).toBe('1688');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. BACKSPACE AND CLEAR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Backspace and Clear', () => {
    it('should remove last character on backspace', () => {
      configure({ min: 0, max: 9999 });
      component.buffer = '123';
      component.backspace();
      expect(component.buffer).toBe('12');
    });

    it('should handle backspace on empty buffer', () => {
      configure({ min: 0, max: 9999 });
      component.buffer = '';
      component.backspace();
      expect(component.buffer).toBe('');
    });

    it('should handle backspace on single character', () => {
      configure({ min: 0, max: 9999 });
      component.buffer = '5';
      component.backspace();
      expect(component.buffer).toBe('');
    });

    it('should clear entire buffer on clear', () => {
      configure({ min: 0, max: 9999 });
      component.buffer = '1688';
      component.clear();
      expect(component.buffer).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. OK — EMITS CONFIRMED WITH VALID BUFFER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('OK button', () => {
    it('should emit confirmed with buffer value when valid', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '1688';

      let emitted: string | undefined;
      component.confirmed.subscribe((val: string) => (emitted = val));

      component.ok();
      expect(emitted).toBe('1688');
    });

    it('should not emit when buffer is out of range', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '2000';

      let emitted = false;
      component.confirmed.subscribe(() => (emitted = true));

      component.ok();
      expect(emitted).toBeFalse();
    });

    it('should not emit when buffer is empty', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '';

      let emitted = false;
      component.confirmed.subscribe(() => (emitted = true));

      component.ok();
      expect(emitted).toBeFalse();
    });

    it('should emit boundary minimum value', () => {
      configure({ min: 20, max: 90 });
      component.buffer = '20';

      let emitted: string | undefined;
      component.confirmed.subscribe((val: string) => (emitted = val));

      component.ok();
      expect(emitted).toBe('20');
    });

    it('should emit boundary maximum value', () => {
      configure({ min: 20, max: 90 });
      component.buffer = '90';

      let emitted: string | undefined;
      component.confirmed.subscribe((val: string) => (emitted = val));

      component.ok();
      expect(emitted).toBe('90');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CANCEL — EMITS CONFIRMED WITH ORIGINAL VALUE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cancel button', () => {
    it('should emit confirmed with original value when cancelled', () => {
      configure({ min: 0, max: 9999, currentValue: '42' });

      let emitted: string | undefined;
      component.confirmed.subscribe((val: string) => (emitted = val));

      component.cancel();
      expect(emitted).toBe('42');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. KEY VALIDATION: PRF RANGE [1111, 1788]
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Key validation — PRF [1111, 1788]', () => {
    beforeEach(() => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '';
    });

    it('should only enable "1" on empty buffer', () => {
      expect(enabledDigits()).toEqual(['1']);
    });

    it('should enable 1-7 after pressing "1"', () => {
      component.buffer = '1';
      // "10"→{10,100-109,1000-1099}   none overlap → disabled
      // "11"→{11,110-119,1100-1199}   1100-1199 overlaps [1111,1788] → enabled
      // "17"→{17,170-179,1700-1799}   1700-1788 overlaps → enabled
      // "18"→{18,180-189,1800-1899}   1800>1788 → disabled
      // "19"→{19,190-199,1900-1999}   1900>1788 → disabled
      expect(enabledDigits()).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    });

    it('should disable 0, 8, 9 after pressing "1"', () => {
      component.buffer = '1';
      expect(component.isDigitEnabled('0')).toBeFalse();
      expect(component.isDigitEnabled('8')).toBeFalse();
      expect(component.isDigitEnabled('9')).toBeFalse();
    });

    it('should enable 1-9 after "11" (1110 out of range, 1111-1119 all valid)', () => {
      component.buffer = '11';
      // "110"→{1100-1109}: 1109<1111 → disabled
      // "111"→{1110-1119}: 1111-1119 overlap → enabled
      // "119"→{1190-1199}: all overlap → enabled
      expect(component.isDigitEnabled('0')).toBeFalse();
      expect(component.isDigitEnabled('1')).toBeTrue();
      expect(component.isDigitEnabled('9')).toBeTrue();
    });

    it('should enable 0-8 after "17"', () => {
      component.buffer = '17';
      // "170"→{1700-1709}: all in range → enabled
      // "178"→{1780-1789}: 1780-1788 overlap → enabled
      // "179"→{1790-1799}: 1790>1788 → disabled
      expect(component.isDigitEnabled('0')).toBeTrue();
      expect(component.isDigitEnabled('8')).toBeTrue();
      expect(component.isDigitEnabled('9')).toBeFalse();
    });

    it('should enable 0-8 after "178"', () => {
      component.buffer = '178';
      // "1780"=1780 in range → enabled
      // "1788"=1788 in range → enabled
      // "1789"=1789>1788 → disabled
      expect(component.isDigitEnabled('0')).toBeTrue();
      expect(component.isDigitEnabled('8')).toBeTrue();
      expect(component.isDigitEnabled('9')).toBeFalse();
    });

    it('should enable 1-9 after "111" (1110 < 1111, 1111-1119 all valid)', () => {
      component.buffer = '111';
      // "1110"=1110<1111 → disabled
      // "1111"=1111 in range → enabled
      // "1119"=1119 in range → enabled
      expect(component.isDigitEnabled('0')).toBeFalse();
      expect(component.isDigitEnabled('1')).toBeTrue();
      expect(component.isDigitEnabled('9')).toBeTrue();
    });

    it('should disable all digits after 4-digit complete value', () => {
      component.buffer = '1688';
      // No 5th digit is valid — already at max digit count
      expect(enabledDigits()).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. KEY VALIDATION: SMALL RANGE [20, 90]
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Key validation — Impact Angle [20, 90]', () => {
    beforeEach(() => {
      configure({ min: 20, max: 90 });
      component.buffer = '';
    });

    it('should enable 2-9 on empty buffer (in numeric order)', () => {
      // "0"→{0,00-09}: 9<20 → disabled
      // "1"→{1,10-19}: 19<20 → disabled
      // "2"→{2,20-29}: 20-29 overlaps → enabled
      // "9"→{9,90-99}: 90 overlaps → enabled
      expect(enabledDigits()).toEqual(['2', '3', '4', '5', '6', '7', '8', '9']);
    });

    it('should disable 0 and 1 on empty buffer', () => {
      expect(component.isDigitEnabled('0')).toBeFalse();
      expect(component.isDigitEnabled('1')).toBeFalse();
    });

    it('should enable 0-9 after "2" (20-29 all valid)', () => {
      component.buffer = '2';
      expect(component.isDigitEnabled('0')).toBeTrue();
      expect(component.isDigitEnabled('9')).toBeTrue();
    });

    it('should enable only 0 after "9" (90 is max)', () => {
      component.buffer = '9';
      expect(component.isDigitEnabled('0')).toBeTrue();
      expect(component.isDigitEnabled('1')).toBeFalse();
    });

    it('should disable all after complete 2-digit value', () => {
      component.buffer = '65';
      expect(enabledDigits()).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. KEY VALIDATION: NEGATIVE RANGE [-100, 100]
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Key validation — Offset [-100, 100]', () => {
    beforeEach(() => {
      configure({ min: -100, max: 100, allowNegative: true });
      component.buffer = '';
    });

    it('should enable negative toggle on empty buffer', () => {
      expect(component.isNegativeEnabled).toBeTrue();
    });

    it('should enable digits 0-9 on empty buffer (0-9 and 10-99 all valid)', () => {
      for (let d = 0; d <= 9; d++) {
        expect(component.isDigitEnabled(String(d))).toBeTrue();
      }
    });

    it('should allow toggling negative sign', () => {
      component.buffer = '50';
      component.toggleNegative();
      expect(component.buffer).toBe('-50');
    });

    it('should allow toggling negative sign off', () => {
      component.buffer = '-50';
      component.toggleNegative();
      expect(component.buffer).toBe('50');
    });

    it('should validate negative value for OK', () => {
      component.buffer = '-100';
      expect(component.isOkEnabled).toBeTrue();
    });

    it('should reject value below min', () => {
      component.buffer = '-101';
      expect(component.isOkEnabled).toBeFalse();
    });

    it('should disable negative toggle when not allowed', () => {
      configure({ min: 0, max: 100, allowNegative: false });
      expect(component.isNegativeEnabled).toBeFalse();
    });

    it('should not toggle negative when disabled', () => {
      configure({ min: 0, max: 100, allowNegative: false });
      component.buffer = '50';
      component.toggleNegative();
      expect(component.buffer).toBe('50');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. KEY VALIDATION: DECIMAL RANGE [0, 99.9]
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Key validation — Arm Delay [0, 99.9]', () => {
    beforeEach(() => {
      configure({ min: 0, max: 99.9, allowDecimal: true });
      component.buffer = '';
    });

    it('should enable decimal point on empty buffer', () => {
      expect(component.isDecimalEnabled).toBeTrue();
    });

    it('should disable decimal when already present', () => {
      component.buffer = '14.';
      expect(component.isDecimalEnabled).toBeFalse();
    });

    it('should disable decimal when allowDecimal is false', () => {
      configure({ min: 0, max: 9999, allowDecimal: false });
      expect(component.isDecimalEnabled).toBeFalse();
    });

    it('should not add decimal when disabled', () => {
      configure({ min: 0, max: 9999, allowDecimal: false });
      component.buffer = '14';
      component.decimal();
      expect(component.buffer).toBe('14');
    });

    it('should accept valid decimal value for OK', () => {
      component.buffer = '14.0';
      expect(component.isOkEnabled).toBeTrue();
    });

    it('should accept 0 for OK', () => {
      component.buffer = '0';
      expect(component.isOkEnabled).toBeTrue();
    });

    it('should accept max boundary 99.9', () => {
      component.buffer = '99.9';
      expect(component.isOkEnabled).toBeTrue();
    });

    it('should reject 100 as over max', () => {
      component.buffer = '100';
      expect(component.isOkEnabled).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. isOkEnabled
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isOkEnabled', () => {
    it('should be false on empty buffer', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '';
      expect(component.isOkEnabled).toBeFalse();
    });

    it('should be false for partial value', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '17';
      expect(component.isOkEnabled).toBeFalse();
    });

    it('should be true for exact minimum', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '1111';
      expect(component.isOkEnabled).toBeTrue();
    });

    it('should be true for exact maximum', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '1788';
      expect(component.isOkEnabled).toBeTrue();
    });

    it('should be true for mid-range value', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '1500';
      expect(component.isOkEnabled).toBeTrue();
    });

    it('should be false for value below min', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '1110';
      expect(component.isOkEnabled).toBeFalse();
    });

    it('should be false for value above max', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '1789';
      expect(component.isOkEnabled).toBeFalse();
    });

    it('should be false for non-numeric buffer', () => {
      configure({ min: 0, max: 100 });
      component.buffer = 'abc';
      expect(component.isOkEnabled).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. NEGATIVE TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Negative toggle', () => {
    it('should add minus to positive buffer', () => {
      configure({ min: -100, max: 100, allowNegative: true });
      component.buffer = '42';
      component.toggleNegative();
      expect(component.buffer).toBe('-42');
    });

    it('should remove minus from negative buffer', () => {
      configure({ min: -100, max: 100, allowNegative: true });
      component.buffer = '-42';
      component.toggleNegative();
      expect(component.buffer).toBe('42');
    });

    it('should handle empty buffer toggle', () => {
      configure({ min: -100, max: 100, allowNegative: true });
      component.buffer = '';
      component.toggleNegative();
      expect(component.buffer).toBe('-');
    });

    it('should disable when toggling would exceed range', () => {
      configure({ min: 0, max: 100, allowNegative: true });
      component.buffer = '50';
      // Toggling to -50 is below min 0
      expect(component.isNegativeEnabled).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. DECIMAL POINT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Decimal point', () => {
    it('should append decimal when enabled', () => {
      configure({ min: 0, max: 99.9, allowDecimal: true });
      component.press('1');
      component.press('4');
      component.decimal();
      expect(component.buffer).toBe('14.');
    });

    it('should not append second decimal', () => {
      configure({ min: 0, max: 99.9, allowDecimal: true });
      component.buffer = '14.';
      component.decimal();
      expect(component.buffer).toBe('14.');
    });

    it('should not append when allowDecimal is false', () => {
      configure({ min: 0, max: 9999, allowDecimal: false });
      component.buffer = '14';
      component.decimal();
      expect(component.buffer).toBe('14');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('should handle single-digit range [5, 5]', () => {
      configure({ min: 5, max: 5 });
      component.buffer = '';
      expect(component.isDigitEnabled('5')).toBeTrue();
      expect(component.isDigitEnabled('4')).toBeFalse();
      expect(component.isDigitEnabled('6')).toBeFalse();
    });

    it('should handle range [0, 0]', () => {
      configure({ min: 0, max: 0 });
      component.buffer = '';
      expect(component.isDigitEnabled('0')).toBeTrue();
      expect(component.isDigitEnabled('1')).toBeFalse();
    });

    it('should handle range [0, 9]', () => {
      configure({ min: 0, max: 9 });
      component.buffer = '';
      for (let d = 0; d <= 9; d++) {
        expect(component.isDigitEnabled(String(d))).toBeTrue();
      }
    });

    it('should handle range starting at 0 [0, 360]', () => {
      configure({ min: 0, max: 360 });
      component.buffer = '';
      // All single digits are valid (0-9 are in range)
      for (let d = 0; d <= 9; d++) {
        expect(component.isDigitEnabled(String(d))).toBeTrue();
      }
    });

    it('should reject digits exceeding max digit count', () => {
      configure({ min: 0, max: 99 });
      component.buffer = '99';
      // No 3rd digit should be valid
      expect(enabledDigits()).toEqual([]);
    });

    it('should handle backspace then re-entry', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '';
      component.press('1');
      component.press('5');
      component.backspace(); // back to "1"
      expect(component.buffer).toBe('1');
      component.press('7'); // now "17"
      expect(component.buffer).toBe('17');
      component.press('8'); // now "178"
      component.press('8'); // now "1788"
      expect(component.buffer).toBe('1788');
      expect(component.isOkEnabled).toBeTrue();
    });

    it('should handle clear then full re-entry', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '1500';
      component.clear();
      expect(component.buffer).toBe('');
      expect(enabledDigits()).toEqual(['1']);
    });

    it('should handle GBU-12 PRF range [1511, 1788]', () => {
      configure({ min: 1511, max: 1788 });
      component.buffer = '';
      // Only "1" can lead to 1511-1788
      expect(enabledDigits()).toEqual(['1']);

      component.buffer = '1';
      // "10"→1000-1099: no overlap. "11"→1100-1199: no (1199<1511).
      // "12"→1200-1299: no. "13"→1300-1399: no. "14"→1400-1499: no (1499<1511).
      // "15"→1500-1599: overlaps (1511-1599). "16"→1600-1699: yes.
      // "17"→1700-1799: yes (1700-1788). "18"→1800-1899: no (1800>1788).
      expect(component.isDigitEnabled('5')).toBeTrue();
      expect(component.isDigitEnabled('6')).toBeTrue();
      expect(component.isDigitEnabled('7')).toBeTrue();
      expect(component.isDigitEnabled('0')).toBeFalse();
      expect(component.isDigitEnabled('1')).toBeFalse();
      expect(component.isDigitEnabled('4')).toBeFalse();
      expect(component.isDigitEnabled('8')).toBeFalse();

      component.buffer = '15';
      // "150"→1500-1509: no (1509<1511). "151"→1510-1519: yes (1511-1519).
      // "159"→1590-1599: yes.
      expect(component.isDigitEnabled('0')).toBeFalse();
      expect(component.isDigitEnabled('1')).toBeTrue();
      expect(component.isDigitEnabled('9')).toBeTrue();
    });

    it('should handle combined negative and decimal [-100, 100]', () => {
      configure({ min: -100, max: 100, allowNegative: true, allowDecimal: true });
      component.press('-');
      component.press('5');
      expect(component.isDecimalEnabled).toBeTrue();
      component.decimal();
      expect(component.buffer).toBe('-5.');
      component.press('5');
      expect(component.buffer).toBe('-5.5');
      expect(component.isOkEnabled).toBeTrue();
    });

    it('should guard ok() even if called directly with invalid buffer', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '9999';

      let emitted = false;
      component.confirmed.subscribe(() => (emitted = true));

      component.ok();
      expect(emitted).toBeFalse();
    });

    it('should guard press() even if called directly with disabled digit', () => {
      configure({ min: 1111, max: 1788 });
      component.buffer = '';
      component.press('9'); // should be blocked
      expect(component.buffer).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. NUMPAD AUTO-CLEAR ON FIRST KEYPRESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Numpad auto-clear', () => {
    it('should clear buffer and append decimal on first decimal press when freshly opened', () => {
      configure({ min: 0, max: 99.9, allowDecimal: true });
      component.buffer = '14';
      component.freshlyOpened = true;
      component.decimal();
      expect(component.buffer).toBe('0.');
    });

    it('should clear buffer on first digit press when freshly opened', () => {
      configure({ min: 0, max: 99.9, currentValue: 14, allowDecimal: true });
      // buffer is '0' and freshlyOpened is true after configure()
      component.press('5');
      expect(component.buffer).toBe('5');
    });

    it('should display 0 when numpad is first opened regardless of current value', () => {
      configure({ min: 0, max: 99.9, currentValue: 14, allowDecimal: true });
      expect(component.buffer).toBe('0');
    });
  });
});


