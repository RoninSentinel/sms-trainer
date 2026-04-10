import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GuardedButtonComponent } from './guarded-button.component';

describe('GuardedButtonComponent', () => {
  let component: GuardedButtonComponent;
  let fixture: ComponentFixture<GuardedButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuardedButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GuardedButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMPONENT CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.label).toBe('Confirm');
    expect(component.active).toBeFalse();
    expect(component.disabled).toBeFalse();
    expect(component.autoCloseMs).toBe(5000);
    expect(component.curtainColor).toBe('brass');
  });

  it('should start with curtain closed', () => {
    expect(component.armed()).toBeFalse();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CURTAIN OPEN / CLOSE
  // ═══════════════════════════════════════════════════════════════════════════

  it('should open the curtain on open()', () => {
    component.open();
    expect(component.armed()).toBeTrue();
  });

  it('should close the curtain on close()', () => {
    component.open();
    component.close();
    expect(component.armed()).toBeFalse();
  });

  it('should not open when disabled', () => {
    component.disabled = true;
    component.open();
    expect(component.armed()).toBeFalse();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. AUTO-CLOSE TIMER
  // ═══════════════════════════════════════════════════════════════════════════

  it('should auto-close after autoCloseMs', fakeAsync(() => {
    component.autoCloseMs = 3000;
    component.open();
    expect(component.armed()).toBeTrue();

    tick(3000);
    expect(component.armed()).toBeFalse();
  }));

  it('should not auto-close when autoCloseMs is 0', fakeAsync(() => {
    component.autoCloseMs = 0;
    component.open();
    expect(component.armed()).toBeTrue();

    tick(10000);
    expect(component.armed()).toBeTrue();

    // Clean up
    component.close();
  }));

  it('should reset auto-close timer on repeated open()', fakeAsync(() => {
    component.autoCloseMs = 5000;
    component.open();

    tick(3000);
    expect(component.armed()).toBeTrue();

    // Re-open resets the timer
    component.open();

    tick(3000);
    expect(component.armed()).toBeTrue();

    tick(2000);
    expect(component.armed()).toBeFalse();
  }));

  it('should clear timer on close()', fakeAsync(() => {
    component.autoCloseMs = 5000;
    component.open();

    tick(1000);
    component.close();

    // Should not throw or re-close after the original timeout
    tick(5000);
    expect(component.armed()).toBeFalse();
  }));

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. BUTTON CLICK (guardedClick emission)
  // ═══════════════════════════════════════════════════════════════════════════

  it('should emit guardedClick when armed and button clicked', () => {
    spyOn(component.guardedClick, 'emit');
    component.open();
    component.onButtonClick();
    expect(component.guardedClick.emit).toHaveBeenCalledTimes(1);
  });

  it('should close curtain after guardedClick', () => {
    component.open();
    component.onButtonClick();
    expect(component.armed()).toBeFalse();
  });

  it('should not emit guardedClick when curtain is closed', () => {
    spyOn(component.guardedClick, 'emit');
    component.onButtonClick();
    expect(component.guardedClick.emit).not.toHaveBeenCalled();
  });

  it('should not emit guardedClick when disabled', () => {
    spyOn(component.guardedClick, 'emit');
    component.disabled = true;
    component.open();
    component.onButtonClick();
    expect(component.guardedClick.emit).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. DOM RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  it('should render curtain when not disabled', () => {
    const curtain = fixture.nativeElement.querySelector('.guard-curtain');
    expect(curtain).toBeTruthy();
  });

  it('should not render curtain when disabled', () => {
    component.disabled = true;
    fixture.detectChanges();
    const curtain = fixture.nativeElement.querySelector('.guard-curtain');
    expect(curtain).toBeNull();
  });

  it('should show label text on curtain', () => {
    component.label = 'Power Off';
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.curtain-label');
    expect(label.textContent.trim()).toBe('Power Off');
  });

  it('should show label text on button', () => {
    component.label = 'Jettison';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.guard-btn');
    expect(btn.textContent.trim()).toBe('Jettison');
  });

  it('should apply curtain-open class when armed', () => {
    component.open();
    fixture.detectChanges();
    const curtain = fixture.nativeElement.querySelector('.guard-curtain');
    expect(curtain.classList).toContain('curtain-open');
  });

  it('should apply guard-disabled class when disabled', () => {
    component.disabled = true;
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.guard-container');
    expect(container.classList).toContain('guard-disabled');
  });

  it('should apply correct curtain color via host attribute', () => {
    component.curtainColor = 'red';
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('data-curtain')).toBe('red');
  });

  it('should apply guard-btn-active class when active', () => {
    component.active = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.guard-btn');
    expect(btn.classList).toContain('guard-btn-active');
  });

  it('should disable the button when curtain is closed', () => {
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.guard-btn');
    expect(btn.disabled).toBeTrue();
  });

  it('should enable the button when curtain is open', () => {
    component.open();
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.guard-btn');
    expect(btn.disabled).toBeFalse();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DOM INTERACTION
  // ═══════════════════════════════════════════════════════════════════════════

  it('should open curtain on curtain click', () => {
    const curtain: HTMLElement = fixture.nativeElement.querySelector('.guard-curtain');
    curtain.click();
    expect(component.armed()).toBeTrue();
  });

  it('should emit on full click-through sequence', () => {
    spyOn(component.guardedClick, 'emit');

    // Step 1: click curtain
    const curtain: HTMLElement = fixture.nativeElement.querySelector('.guard-curtain');
    curtain.click();
    fixture.detectChanges();

    // Step 2: click button
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.guard-btn');
    btn.click();

    expect(component.guardedClick.emit).toHaveBeenCalledTimes(1);
    expect(component.armed()).toBeFalse();
  });
});
