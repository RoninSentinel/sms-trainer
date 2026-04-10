# GuardedButtonComponent

A reusable two-step guarded button that mimics the real GSMS "lift-to-arm" pattern. A protective curtain covers the button; the user must click the curtain to slide it open, then click the actual button underneath. This prevents accidental activation of critical actions.

## Selector

```html
<app-guarded-button>
```

## Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `'Confirm'` | Text displayed on both the curtain and the button. |
| `active` | `boolean` | `false` | Visual state indicator (e.g. a store is powered on). Does not affect behavior. |
| `disabled` | `boolean` | `false` | Disables the entire control. The curtain is hidden and the button becomes inert. |
| `autoCloseMs` | `number` | `5000` | Milliseconds before the curtain automatically closes after being opened. Set to `0` to disable auto-close. |
| `curtainColor` | `'brass' \| 'red' \| 'grey'` | `'brass'` | Color theme for the curtain overlay. |

### Curtain color themes

- **brass** -- Yellow background with a red striped border. Default military guard style.
- **red** -- Red hazard guard with a gradient background.
- **grey** -- Neutral grey guard.

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `guardedClick` | `EventEmitter<void>` | Emitted when the user completes the full two-step sequence: opening the curtain, then clicking the button. |

## Usage

### Basic

```html
<app-guarded-button
  label="Power Off"
  (guardedClick)="handlePowerOff()">
</app-guarded-button>
```

### With all options

```html
<app-guarded-button
  label="Jettison"
  [active]="isActive"
  [disabled]="isDisabled"
  [autoCloseMs]="3000"
  curtainColor="red"
  (guardedClick)="handleJettison()">
</app-guarded-button>
```

### Importing

This is a standalone component. Import it directly into your component's `imports` array:

```typescript
import { GuardedButtonComponent } from '@components/shared/guarded-button/guarded-button.component';

@Component({
  imports: [GuardedButtonComponent],
  // ...
})
export class MyComponent {}
```

## Behavior

1. The curtain covers the button in its default (closed) state.
2. Clicking the curtain slides it upward, revealing the button underneath (armed state).
3. The user can now click the exposed button, which emits `guardedClick` and closes the curtain.
4. If the user does not click the button within the `autoCloseMs` timeout, the curtain automatically slides back down.
5. Re-opening the curtain resets the auto-close timer.
6. When `disabled` is `true`, the curtain is not rendered and the button is inert.

## Accessibility

- The curtain has `role="button"` and `tabindex="0"`, making it keyboard-focusable.
- Both the curtain and button respond to `Enter` key presses.
- The curtain includes an `aria-label` of `"Open guard for <label>"`.
