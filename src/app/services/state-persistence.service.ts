/**
 * state-persistence.service.ts
 * ============================
 * Handles persistence of the SMS trainer application state to localStorage.
 *
 * All persistable signals from SmsService are serialized into a single JSON
 * blob under the key `sms-trainer-state`.  This service provides three
 * methods:
 *
 *   - save(snapshot)  — writes the current state to localStorage
 *   - load()          — reads and parses the saved state (or returns null)
 *   - clear()         — removes the saved state entirely
 *
 * Design notes:
 *   - A single key is used rather than per-signal keys to guarantee atomic
 *     snapshots — you never get a half-written state.
 *   - A version number is embedded so that future schema changes can be
 *     detected and migrated (or discarded).
 *   - localStorage is synchronous, so no async handling is required.
 *   - The snapshot size for this application is typically 5–20 KB of JSON,
 *     well within the ~5 MB localStorage budget.
 *
 * This service is intentionally decoupled from SmsService so that:
 *   - It can be independently tested with mock localStorage.
 *   - The persistence mechanism can be swapped (e.g. IndexedDB) without
 *     touching the state management logic.
 */

import { Injectable } from '@angular/core';
import {
  Station,
  SavedTarget,
  Profile,
  GbuSettings,
  HellfireSettings,
  ReleaseSettings,
  LinkState,
  StsState,
} from './sms.service';

/* ═══════════════════════════════════════════════════════════════════════════
   SNAPSHOT INTERFACE
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * StateSnapshot — the complete set of persistable state from SmsService.
 *
 * Every writable signal in SmsService that holds user-modified data is
 * represented here.  Transient UI state (popup visibility, scroll offsets,
 * keyboard buffers) is intentionally excluded — those reset on navigation
 * and don't need persistence.
 */
export interface StateSnapshot {
  /** Schema version for forward-compatible migrations. */
  version: number;

  /** All weapon stations with their current loadout and status. */
  stations: Station[];

  /** Saved targets created by the user. */
  savedTargets: SavedTarget[];

  /** Name of the currently selected target. */
  selectedTargetName: string;

  /** Currently selected station ID (or null). */
  selectedStationId: number | null;

  /** Per-station GBU weapon settings (keyed by station ID). */
  gbuSettings: Record<number, GbuSettings>;


  /** Per-station Hellfire weapon settings (keyed by station ID). */
  hellfireSettings: Record<number, HellfireSettings>;

  /** Per-station release / tactical settings (keyed by station ID). */
  releaseSettings: Record<number, ReleaseSettings>;

  /** The 8 configurable weapon employment profiles. */
  profiles: Profile[];

  /** Active cautions and warnings. */
  warnings: { level: 'WARNING' | 'CAUTION'; msg: string }[];

  /** Data-link indicator state. */
  linkState: LinkState;

  /** System status indicator state. */
  stsState: StsState;

  /** Per-target store assignments (target name → array of store IDs). */
  storeAssignments: Record<string, string[]>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE IMPLEMENTATION
   ═══════════════════════════════════════════════════════════════════════════ */

/** The localStorage key under which the state snapshot is stored. */
const STORAGE_KEY = 'sms-trainer-state';

/** Current schema version — increment when the snapshot shape changes. */
const CURRENT_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class StatePersistenceService {
  /**
   * save
   * Serializes the given snapshot to JSON and writes it to localStorage.
   *
   * @param snapshot - The complete state snapshot to persist.
   */
  save(snapshot: StateSnapshot): void {
    try {
      const json = JSON.stringify(snapshot);
      localStorage.setItem(STORAGE_KEY, json);
    } catch (err) {
      // localStorage can throw if the quota is exceeded or if the browser
      // is in private/incognito mode with storage disabled.  We log the
      // error but don't crash — the app will simply not persist state.
      console.warn('[StatePersistenceService] Failed to save state:', err);
    }
  }

  /**
   * load
   * Reads the saved state snapshot from localStorage, parses it, and
   * returns it.  Returns null if no saved state exists, if the JSON is
   * corrupt, or if the schema version is incompatible.
   *
   * @returns The parsed StateSnapshot, or null if unavailable.
   */
  load(): StateSnapshot | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return null;

      const parsed = JSON.parse(json) as StateSnapshot;

      // Version guard: if the saved schema is from a different version,
      // discard it rather than risk hydrating mismatched data.
      if (parsed.version !== CURRENT_VERSION) {
        console.warn(
          `[StatePersistenceService] Schema version mismatch: saved=${parsed.version}, current=${CURRENT_VERSION}. Discarding.`,
        );
        this.clear();
        return null;
      }

      return parsed;
    } catch (err) {
      console.warn('[StatePersistenceService] Failed to load state:', err);
      return null;
    }
  }

  /**
   * clear
   * Removes the saved state snapshot from localStorage entirely.
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[StatePersistenceService] Failed to clear state:', err);
    }
  }
}
