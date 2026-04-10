/**
 * KeyboardPopupComponent
 * ======================
 * Reusable on-screen QWERTY keyboard matching the GSMS keyboard windows
 * (Figures 1-87, 1-88, 1-89, 1-90 from TO 1Q-9(M)A-34-1-1).
 *
 * Supports three header modes:
 *   - **name**        – "Name:" label + input display
 *   - **coordinates** – Coord-format toggle button + input display
 *                       Clicking the format button opens the "Choose
 *                       Coordinate System" popup (Figure 1-89) with four
 *                       options: DDMMSSsss, DDMMmmmmm, UTM, MGRS.
 *   - **elevation**   – "Elevation:" label + input display + unit/ref toggles
 *
 * The parent component controls visibility; this component manages its own
 * internal buffer and emits the confirmed value on OK, or signals Cancel.
 *
 * Usage example:
 * ```html
 * @if (keyboardMode !== 'hidden') {
 *   <app-keyboard-popup
 *     [mode]="keyboardMode"
 *     [initialValue]="keyboardBuffer"
 *     [coordFormat]="coordFormat"
 *     [elevUnit]="elevUnit"
 *     [elevRef]="elevRef"
 *     (ok)="onKeyboardOk($event)"
 *     (cancel)="onKeyboardCancel()"
 *     (coordFormatCycle)="setCoordFormat($event)"
 *     (elevUnitToggle)="toggleElevUnit()"
 *     (elevRefCycle)="cycleElevRef()"
 *   />
 * }
 * ```
 */
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

/** The keyboard mode determines which header is rendered. */
export type KeyboardMode = 'coordinates' | 'elevation' | 'name';

/**
 * CoordFormatOption
 * Describes one coordinate format choice shown in the Choose Coordinate
 * System popup (Figure 1-89).
 */
export interface CoordFormatOption {
  /** Display label shown on the popup button (e.g. "DDMMSSsss", "MGRS"). */
  label: string;
  /** Mask template shown in the coordinate input bar. */
  mask: string;
}

@Component({
  selector: 'app-keyboard-popup',
  standalone: true,
  imports: [],
  templateUrl: './keyboard-popup.component.html',
  styleUrls: ['./keyboard-popup.component.scss'],
})
export class KeyboardPopupComponent implements OnInit, OnChanges {
  // ── Inputs ─────────────────────────────────────────────────────────────────

  /** Which header variant to display. */
  @Input() mode: KeyboardMode = 'name';

  /** Pre-populated value for the keyboard buffer. */
  @Input() initialValue = '';

  /** Current coordinate format label (shown in coordinates mode header). */
  @Input() coordFormat = 'MGRS';

  /** Current elevation unit (shown in elevation mode header). */
  @Input() elevUnit = 'Feet';

  /** Current elevation reference datum (shown in elevation mode header). */
  @Input() elevRef = 'MSL-84';

  // ── Outputs ────────────────────────────────────────────────────────────────

  /** Emits the confirmed buffer value when the user presses OK. */
  @Output() ok = new EventEmitter<string>();

  /** Emits when the user presses Cancel (no value). */
  @Output() cancelled = new EventEmitter<void>();

  /**
   * Emits the selected coordinate format label when the user picks a format
   * from the Choose Coordinate System popup (Figure 1-89).
   * The parent should update its own coordFormat state from this value.
   */
  @Output() coordFormatCycle = new EventEmitter<string>();

  /** Emits when the user clicks the elevation-unit toggle button. */
  @Output() elevUnitToggle = new EventEmitter<void>();

  /** Emits when the user clicks the elevation-reference cycle button. */
  @Output() elevRefCycle = new EventEmitter<void>();

  // ── Internal State ─────────────────────────────────────────────────────────

  /** The text buffer the user is actively editing. */
  buffer = '';

  /** QWERTY key rows matching the demo layout (Figures 1-87 through 1-90). */
  readonly keyRows: string[][] = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '.'],
  ];

  // ── Choose Coordinate System Popup (Figure 1-89) ───────────────────────────

  /**
   * The four coordinate format options as shown in Figure 1-89.
   * Labels match the real GSMS buttons exactly.
   */
  readonly coordFormats: CoordFormatOption[] = [
    { label: 'DDMMSSsss', mask: `_ __\u00B0__'__.___" _ ___\u00B0__'__.___"` },
    { label: 'DDMMmmmmm', mask: `_ __\u00B0__._____ _ ___\u00B0__._____` },
    { label: 'UTM', mask: `___ ________ ________` },
    { label: 'MGRS', mask: `___ __ __________` },
  ];

  /** Whether the "Choose Coordinate System" popup overlay is visible. */
  showCoordSystemPopup = false;

  /**
   * coordFormatIndex (getter)
   * Returns the index into coordFormats that matches the current coordFormat
   * input.  Used in the template to highlight the currently-selected button.
   */
  get coordFormatIndex(): number {
    return this.coordFormats.findIndex((f) => f.label === this.coordFormat);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.buffer = this.initialValue;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue']) {
      this.buffer = this.initialValue;
    }
  }

  // ── Key State ────────────────────────────────────────────────────────────

  /** Characters allowed in elevation mode (digits + dash + period). */
  private readonly ELEVATION_ALLOWED = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '.']);

  /**
   * isKeyDisabled
   * Returns true if the given key should be disabled based on the current mode.
   * In elevation mode, all letter keys are disabled — only digits, dash, and
   * period are allowed, matching the real GSMS behavior (Figure 1-90).
   */
  isKeyDisabled(key: string): boolean {
    if (this.mode === 'elevation') {
      return !this.ELEVATION_ALLOWED.has(key);
    }
    return false;
  }

  // ── Choose Coordinate System Methods ───────────────────────────────────────

  /**
   * openCoordSystemPopup
   * Shows the "Choose Coordinate System" popup overlay (Figure 1-89).
   * Called when the user clicks the coord-format button in the keyboard header.
   */
  openCoordSystemPopup(): void {
    this.showCoordSystemPopup = true;
  }

  /**
   * selectCoordFormat
   * Selects a coordinate format by index from the popup, closes the popup,
   * and emits the coordFormatCycle output with the chosen format label so the
   * parent can update its state.
   */
  selectCoordFormat(index: number): void {
    this.showCoordSystemPopup = false;
    const selected = this.coordFormats[index];
    if (selected) {
      this.coordFormatCycle.emit(selected.label);
    }
  }

  // ── Key Handlers ───────────────────────────────────────────────────────────

  /** Appends a character to the buffer. */
  onKeyPress(key: string): void {
    this.buffer += key;
  }

  /** Removes the last character from the buffer (backspace). */
  onKeyDelete(): void {
    this.buffer = this.buffer.slice(0, -1);
  }

  /** Clears the entire buffer. */
  onKeyClear(): void {
    this.buffer = '';
  }

  /** Appends a space character to the buffer. */
  onKeySpace(): void {
    this.buffer += ' ';
  }

  /**
   * onKeyOk
   * Confirms the input, closes the coord system popup if open, and emits
   * the buffer value.
   */
  onKeyOk(): void {
    this.showCoordSystemPopup = false;
    this.ok.emit(this.buffer);
  }

  /** Discards the input and emits cancel. */
  onKeyCancel(): void {
    this.showCoordSystemPopup = false;
    this.cancelled.emit();
  }
}
