/**
 * NumpadPopupComponent
 * ====================
 * Reusable on-screen numeric keypad popup matching the real SMS software's
 * PRF Code Keypad (Figure 1-51) and offset/angle input dialogs.
 *
 * KEY VALIDATION:
 *   Each digit key (0-9) is only enabled if appending that digit to the
 *   current buffer could still lead to a value within [min, max].  The OK
 *   button is only enabled when the buffer already IS a valid value.  The
 *   minus and decimal keys are similarly gated.
 *
 *   For example, with range [1111, 1788] and an empty buffer, only "1" is
 *   enabled because every valid PRF code starts with 1.  After pressing "1",
 *   digits 1–7 are enabled (for 11xx through 17xx), etc.
 */

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-numpad-popup',
  standalone: true,
  imports: [],
  templateUrl: './numpad-popup.component.html',
  styleUrls: ['./numpad-popup.component.scss'],
})
export class NumpadPopupComponent implements OnInit, OnChanges {
  // ── Inputs ────────────────────────────────────────────────────────────────

  @Input() title = '';
  @Input() min = 0;
  @Input() max = 9999;
  @Input() currentValue: string | number = '';
  @Input() allowNegative = false;
  @Input() allowDecimal = false;

  // ── Outputs ───────────────────────────────────────────────────────────────

  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  // ── Internal state ────────────────────────────────────────────────────────

  buffer = '';

  /** Digit keys, iterated by the template to build the grid. */
  readonly digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

  private originalValue: string | number = '';
  freshlyOpened = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.originalValue = this.currentValue;
    this.buffer = '0';
    this.freshlyOpened = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentValue']) {
      this.originalValue = this.currentValue;
      this.buffer = '0';
      this.freshlyOpened = true;
    }
  }

  // ── Key handlers ──────────────────────────────────────────────────────────

  press(digit: string): void {
    if (!this.isDigitEnabled(digit)) return;
    if (this.freshlyOpened) {
      this.buffer = '';
      this.freshlyOpened = false;
    }
    this.buffer += digit;
  }

  backspace(): void {
    this.buffer = this.buffer.slice(0, -1);
  }

  clear(): void {
    this.buffer = '';
  }

  toggleNegative(): void {
    if (!this.isNegativeEnabled) return;
    this.freshlyOpened = false;
    if (this.buffer.startsWith('-')) {
      this.buffer = this.buffer.slice(1);
    } else {
      this.buffer = '-' + this.buffer;
    }
  }

  decimal(): void {
    if (!this.isDecimalEnabled) return;
    if (this.freshlyOpened) {
      this.buffer = '0';
      this.freshlyOpened = false;
    }
    if (!this.buffer.includes('.')) {
      this.buffer += '.';
    }
  }

  ok(): void {
    if (!this.isOkEnabled) return;
    this.confirmed.emit(this.buffer);
  }

  cancel(): void {
    this.confirmed.emit(String(this.originalValue));
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  KEY VALIDATION — only enable keys that can lead to a value in [min, max]
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Returns true if appending `digit` to the current buffer could still
   * produce a value within [min, max] (either directly or with further input).
   */
  isDigitEnabled(digit: string): boolean {
    return this.canLeadToValidValue(this.buffer + digit);
  }

  /** OK is enabled only when the buffer is already a valid value in range. */
  get isOkEnabled(): boolean {
    const val = parseFloat(this.buffer);
    return !isNaN(val) && val >= this.min && val <= this.max;
  }

  /** Negative toggle is enabled if flipping the sign could lead to a valid value. */
  get isNegativeEnabled(): boolean {
    if (!this.allowNegative) return false;
    const toggled = this.buffer.startsWith('-') ? this.buffer.slice(1) : '-' + this.buffer;
    return this.canLeadToValidValue(toggled);
  }

  /** Decimal point is enabled if adding '.' could lead to a valid value. */
  get isDecimalEnabled(): boolean {
    if (!this.allowDecimal) return false;
    if (this.buffer.includes('.')) return false;
    return this.canLeadToValidValue(this.buffer + '.');
  }

  // ── Core validation logic ─────────────────────────────────────────────────

  /**
   * Determines whether a given prefix string could lead to a numeric value
   * within [min, max] by appending zero or more additional digits.
   *
   * Strategy:
   *   For each possible number of additional digits (0, 1, 2, ... up to the
   *   max digit count), compute the range of completions at that length and
   *   check whether it overlaps [min, max].  The ranges are NOT contiguous
   *   across lengths (e.g. "7" → {7}, {70-79}, {700-799}, {7000-7999} are
   *   four separate bands), so each must be checked independently.
   *
   * Examples for range [1111, 1788]:
   *   "1" → length-3 pad: [1000,1999] overlaps [1111,1788] → true
   *   "7" → {7},{70-79},{700-799},{7000-7999} — none overlap → false
   *   "2" → length-3 pad: [2000,2999] — 2000>1788 → false
   */
  private canLeadToValidValue(prefix: string): boolean {
    // Incomplete fragments that need more input — always allow
    if (prefix === '' || prefix === '-' || prefix === '.' || prefix === '-.') {
      return true;
    }

    const val = parseFloat(prefix);
    if (isNaN(val)) return false;

    // Already a valid in-range value? Always OK.
    if (val >= this.min && val <= this.max) return true;

    const isNeg = prefix.startsWith('-');
    const absPrefix = isNeg ? prefix.slice(1) : prefix;
    const hasDot = absPrefix.includes('.');

    // Max number of integer digits based on the range endpoints
    const absMax = Math.max(Math.abs(this.min), Math.abs(this.max));
    const maxIntDigits = Math.max(String(Math.floor(absMax)).length, 1);

    const intPart = hasDot ? absPrefix.split('.')[0] : absPrefix;

    // If prefix already has more integer digits than the range allows, done
    if (intPart.length > maxIntDigits) return false;

    // ── Decimal prefix ────────────────────────────────────────────────────
    if (hasDot) {
      if (isNeg) {
        return val - 1 <= this.max && val >= this.min;
      }
      return val <= this.max && val + 1 >= this.min;
    }

    // ── Integer prefix — check each possible completion length ────────────
    const remaining = maxIntDigits - intPart.length;

    // Check each pad length: 0 additional digits, 1 additional, ..., remaining
    for (let pad = 0; pad <= remaining; pad++) {
      const sign = isNeg ? '-' : '';
      const lo = parseFloat(sign + absPrefix + '0'.repeat(pad));
      const hi = parseFloat(sign + absPrefix + '9'.repeat(pad));
      const bandMin = Math.min(lo, hi);
      const bandMax = Math.max(lo, hi);

      // Does [bandMin, bandMax] overlap [this.min, this.max]?
      if (bandMin <= this.max && bandMax >= this.min) {
        return true;
      }
    }

    return false;
  }
}
