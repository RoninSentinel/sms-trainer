import { Component, Input, Output, EventEmitter, HostBinding, signal, OnDestroy } from '@angular/core';
/**
 * GuardedButtonComponent
 * ======================
 * A reusable two-step guarded button matching the real GSMS "lift-to-arm"
 * pattern. A protective curtain covers the button; the user must click the
 * curtain to slide it open, then click the actual button underneath.
 *
 * The curtain auto-closes after a configurable timeout (default 5 s).
 *
 * Usage:
 *   <app-guarded-button
 *     label="Power Off"
 *     [active]="isStorePowered(type)"
 *     [disabled]="isPowerDisabled(type)"
 *     [autoCloseMs]="5000"
 *     curtainColor="brass"
 *     (guardedClick)="handlePowerOff()">
 *   </app-guarded-button>
 */
@Component({
  selector: 'app-guarded-button',
  standalone: true,
  imports: [],
  templateUrl: './guarded-button.component.html',
  styleUrls: ['./guarded-button.component.scss'],
})
export class GuardedButtonComponent implements OnDestroy {
  @Input() label = 'Confirm';
  @Input() active = false;

  /** Disables the entire control — curtain and button become inert. */
  @Input() disabled = false;

  /** Milliseconds before the curtain auto-closes. 0 = no auto-close. */
  @Input() autoCloseMs = 5000;

  /**
   * Curtain color theme.
   *   'brass'  — olive/brass military guard (default)
   *   'red'    — red hazard guard
   *   'grey'   — neutral grey guard
   */
  @Input() curtainColor: 'brass' | 'red' | 'grey' = 'brass';

  @HostBinding('attr.data-curtain')
  get curtainColorAttr(): string {
    return this.curtainColor;
  }

  /** Emitted when the user completes both clicks (curtain open + button). */
  @Output() guardedClick = new EventEmitter<void>();

  /** Whether the curtain is currently open (armed). */
  readonly armed = signal(false);

  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  /** Opens the curtain. */
  open(): void {
    if (this.disabled) return;
    this.armed.set(true);

    // Schedule auto-close
    if (this.autoCloseMs > 0) {
      this.clearTimer();
      this.autoCloseTimer = setTimeout(() => this.close(), this.autoCloseMs);
    }
  }

  /** Closes the curtain. */
  close(): void {
    this.armed.set(false);
    this.clearTimer();
  }

  /** Handles the actual button click (only possible when armed). */
  onButtonClick(): void {
    if (this.disabled || !this.armed()) return;
    this.guardedClick.emit();
    this.close();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.autoCloseTimer !== null) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
  }
}
