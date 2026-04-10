# State Persistence Developer Guide

## SMS Trainer — Surviving Page Refresh

**Last updated:** March 2026
**Applies to:** All pages and components in the SMS Trainer application

---

## Overview

The SMS Trainer uses `localStorage` to persist all application state across page refreshes. This is handled by two services working together:

- **`SmsService`** (`src/app/services/sms.service.ts`) — the central state store. All shared, persisted state lives here as Angular signals.
- **`StatePersistenceService`** (`src/app/services/state-persistence.service.ts`) — the low-level read/write layer. Serializes the entire state into a single JSON blob under the `localStorage` key `sms-trainer-state`.

**You do not need to manually save or load anything.** An `effect()` inside `SmsService` watches every persisted signal and auto-saves whenever any of them change. On construction (app startup / refresh), `SmsService` automatically hydrates all signals from the saved snapshot.

---

## The Golden Rule

> **If you want data to survive a page refresh, it must live on `SmsService` as a signal.**

Component-local state (`activeView`, `showPopup`, `keyboardBuffer`, etc.) intentionally resets on refresh — that's transient UI state. But anything the user _created_ or _configured_ (targets, weapon settings, store assignments, station loadouts, profiles) must be stored in an `SmsService` signal to be auto-persisted.

---

## How It Works (Architecture)

```
┌─────────────────────────────────────────────────────────┐
│                     SmsService                          │
│                                                         │
│  signals:  stations, savedTargets, gbuSettings,         │
│            hellfireSettings, storeAssignments, ...       │
│                                                         │
│  constructor() {                                        │
│    1. hydrateFromStorage()     ← reads localStorage     │
│    2. effect(() => {                                    │
│         build snapshot from all signals                 │
│         persistence.save(snapshot)  ← writes on change  │
│       })                                                │
│  }                                                      │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│              StatePersistenceService                     │
│                                                         │
│  save(snapshot)  → localStorage.setItem(key, JSON)      │
│  load()          → JSON.parse(localStorage.getItem(key))│
│  clear()         → localStorage.removeItem(key)         │
└─────────────────────────────────────────────────────────┘
```

The auto-save `effect()` uses `setTimeout(0)` to coalesce multiple rapid signal writes (e.g., "Apply To Type" updating 4 stations at once) into a single `localStorage` write.

---

## Procedures

### Procedure 1: Your page has local state that should survive refresh

**Scenario:** You're building a new page (or modifying an existing one) and you have component-local state — a plain property, a local `signal()`, or a form field — that gets wiped on refresh.

**Steps:**

1. **Decide if it belongs in SmsService.** Ask: "Is this user-created or user-configured data that another page might need, or that should survive refresh?" If yes, proceed. If it's purely transient UI state (popup open/closed, scroll position, animation state), leave it local.

2. **Add a signal to SmsService.** Open `src/app/services/sms.service.ts` and add your new signal in the appropriate section:

   ```typescript
   // ── Your New State ─────────────────────────────────────────
   /** Description of what this holds. */
   readonly myNewState = signal<MyType>(defaultValue);
   ```

3. **Add the field to the `StateSnapshot` interface.** Open `src/app/services/state-persistence.service.ts` and add the field:

   ```typescript
   export interface StateSnapshot {
     // ... existing fields ...

     /** Description of what this holds. */
     myNewState: MyType;
   }
   ```

4. **Add it to the auto-save effect in SmsService.** In the constructor's `effect()`, add your signal to the snapshot object:

   ```typescript
   const snapshot: StateSnapshot = {
     // ... existing fields ...
     myNewState: this.myNewState(), // ← ADD THIS
   };
   ```

5. **Add it to `hydrateFromStorage()`.** In the `hydrateFromStorage()` method:

   ```typescript
   if (snapshot.myNewState !== undefined) this.myNewState.set(snapshot.myNewState);
   ```

   > **Important:** Use `!== undefined` for values where `null`, `0`, `false`, or `''` are valid. Use a simple truthiness check (`if (snapshot.myNewState)`) only for objects/arrays where `null`/`undefined` mean "use defaults".

6. **Add it to `resetToDefaults()`.** Reset to the same default you used in the signal declaration:

   ```typescript
   this.myNewState.set(defaultValue);
   ```

7. **Bump the schema version** (if this is a breaking change). In `state-persistence.service.ts`, increment `CURRENT_VERSION`. This will cause existing saved snapshots to be discarded on next load, forcing a clean start. Only do this for structural changes — adding a new optional field with a fallback doesn't require a version bump.

8. **Wire your component to the SmsService signal.** Replace your local state with an alias:

   ```typescript
   // BEFORE (local, lost on refresh):
   myState = signal<MyType>(defaultValue);

   // AFTER (persisted via SmsService):
   protected readonly myState = this.sms.myNewState;
   ```

   All `.set()`, `.update()`, and `()` calls work identically through the alias.

9. **Update tests.** In your component spec, access the state via `smsService.myNewState` instead of `component.myState` (since the alias is `protected`).

---

### Procedure 2: Adding a new settings type for a new weapon

**Scenario:** A new weapon type is being added (e.g., SDB) with its own settings interface.

**Steps:**

1. **Define the settings interface** in `sms.service.ts`:

   ```typescript
   export interface SdbSettings {
     fuzeMode: 'Impact' | 'Proximity';
     releaseAltitude: number;
     // ...
   }
   ```

2. **Add a signal and accessor/mutator** following the existing pattern:

   ```typescript
   readonly sdbSettings = signal<Record<number, SdbSettings>>({});

   defaultSdb(): SdbSettings {
     return { fuzeMode: 'Impact', releaseAltitude: 500 };
   }

   getSdbSettings(stationId: number): SdbSettings {
     const map = this.sdbSettings();
     if (!map[stationId]) {
       this.sdbSettings.update(m => ({ ...m, [stationId]: this.defaultSdb() }));
     }
     return this.sdbSettings()[stationId];
   }

   setSdbSettings(stationId: number, s: SdbSettings): void {
     this.sdbSettings.update(m => ({ ...m, [stationId]: s }));
   }
   ```

3. **Follow steps 3–7 from Procedure 1** to wire it into the snapshot, hydration, reset, and (optionally) version bump.

---

### Procedure 3: Resetting state during development / testing

**Option A: In the browser console:**

```javascript
localStorage.removeItem('sms-trainer-state');
location.reload();
```

**Option B: Call `resetToDefaults()` from a component:**

```typescript
this.sms.resetToDefaults();
```

This clears `localStorage` and resets every signal to factory defaults. We plan to wire this to a "Reset Trainer" button in the UI.

**Option C: In unit tests — add to `beforeEach`:**

```typescript
beforeEach(async () => {
  localStorage.removeItem('sms-trainer-state');
  // ... rest of TestBed setup
});
```

This prevents state from leaking between test suites.

---

## Checklist for Code Review

When reviewing a PR that adds or modifies persisted state, verify:

- [ ] New signal added to `SmsService`
- [ ] Field added to `StateSnapshot` interface
- [ ] Signal read in the `effect()` snapshot builder
- [ ] Signal hydrated in `hydrateFromStorage()`
- [ ] Signal reset in `resetToDefaults()`
- [ ] Component uses alias to `SmsService` signal (not a local copy)
- [ ] Tests access persisted state via `smsService.*`, not `component.*`
- [ ] Tests include `localStorage.removeItem('sms-trainer-state')` in `beforeEach`
- [ ] Schema version bumped if snapshot structure changed incompatibly

---

## What NOT to Persist

Not everything belongs in localStorage. Keep these as component-local state:

| State                                            | Why it's local                                            |
| ------------------------------------------------ | --------------------------------------------------------- |
| `activeView` ('select' / 'create' / 'modify')    | User should land on the default view after refresh        |
| `showPopup`, `showStorePopup`, `showSourcePopup` | Popups should be closed on refresh                        |
| `keyboardMode`, `keyboardBuffer`                 | Keyboard should be hidden on refresh                      |
| `scrollOffset`                                   | Minor UX — resetting to top is fine                       |
| `deleteGuardArmed`                               | Security — guarded actions should require re-confirmation |
| `newTarget` (create/modify form data)            | Unsaved form data is inherently transient                 |
| `verifyState` (inventory verification)           | Verification should restart from idle                     |

---

## Troubleshooting

**"My data still disappears on refresh"**

- Verify the signal is on `SmsService`, not local to your component.
- Verify the signal is read inside the `effect()` snapshot builder. If the effect doesn't read it, it won't track it.
- Check the browser devtools → Application → Local Storage → look for `sms-trainer-state` and inspect the JSON.

**"State from another developer's tests is leaking into mine"**

- Add `localStorage.removeItem('sms-trainer-state')` to your spec's `beforeEach`, before `TestBed.configureTestingModule()`.

**"After changing the snapshot interface, the app loads with weird data"**

- Bump `CURRENT_VERSION` in `state-persistence.service.ts`. Old snapshots with the wrong version are automatically discarded.

**"localStorage is full / throws QuotaExceededError"**

- The persistence service catches and logs this — the app continues working, just without persistence. Clear storage via devtools if needed. The typical snapshot is 5–20 KB, well within the ~5 MB budget.
