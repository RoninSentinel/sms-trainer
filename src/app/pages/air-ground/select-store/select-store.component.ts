import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { SmsService, StoreType, StoreStatus } from '../../../services/sms.service';
import { GuardedButtonComponent } from '../../../components/shared/guarded-button/guarded-button.component';

const BIT_SEQUENCES: Record<string, { status: StoreStatus; durationMs: number }[]> = {
  Hellfire: [
    { status: 'IDLE', durationMs: 2000 },
    { status: 'BIT', durationMs: 3000 },
    { status: 'IDLE', durationMs: 5000 },
    { status: 'READY', durationMs: 0 },
  ],
  GBU38: [
    { status: 'IBIT', durationMs: 3000 },
    { status: 'WARMUP', durationMs: 5000 },
    { status: 'DEGRD', durationMs: 4000 },
    { status: 'AUR', durationMs: 0 },
  ],
  GBU49: [
    { status: 'IBIT', durationMs: 3000 },
    { status: 'WARMUP', durationMs: 5000 },
    { status: 'DEGRD', durationMs: 4000 },
    { status: 'AUR', durationMs: 0 },
  ],
  GBU12: [{ status: 'READY', durationMs: 0 }],
};

/** Maps store types to their BIT sequence key. */
function getBitKey(type: StoreType): string {
  switch (type) {
    case 'Hellfire':
      return 'Hellfire';
    case 'GBU38':
      return 'GBU38';
    case 'GBU49':
    case 'GBU54':
    case 'GBU48':
      return 'GBU49';
    case 'GBU12':
      return 'GBU12';
    default:
      return 'GBU12';
  }
}

/** Returns true if a store type can be powered by the aircraft. */
function canBePowered(type: StoreType): boolean {
  return type !== 'GBU12' && type !== '' && type !== 'AWM' && type !== 'M36';
}

@Component({
  selector: 'app-select-store',
  standalone: true,
  imports: [GuardedButtonComponent],
  templateUrl: './select-store.component.html',
  styleUrls: ['./select-store.component.scss'],
})
export class SelectStoreComponent implements OnDestroy {
  private readonly sms = inject(SmsService);

  protected readonly stations = this.sms.stations;
  protected readonly selectedType = signal<StoreType | null>(null);

  /** Active BIT-sequence timers so we can cancel on destroy. */
  private bitTimers: ReturnType<typeof setTimeout>[] = [];

  storeRows: { type: StoreType; label: string; shortName: string; family: string; icon: string }[] = [
    {
      type: 'GBU12',
      label: 'GBU12 Legacy',
      shortName: 'GB12',
      family: 'GBU',
      icon: 'assets/weapon-icons/GBU.png',
    },
    {
      type: 'GBU49',
      label: 'GBU49 Legacy',
      shortName: 'GB49',
      family: 'GBU',
      icon: 'assets/weapon-icons/GBU.png',
    },
    {
      type: 'GBU48',
      label: 'GBU48 Legacy',
      shortName: 'GB48',
      family: 'GBU',
      icon: 'assets/weapon-icons/GBU.png',
    },
    { type: 'GBU38', label: 'GBU38 Legacy', shortName: 'GB38', family: 'GBU', icon: 'assets/weapon-icons/GBU.png' },
    {
      type: 'Hellfire',
      label: 'Hellfire',
      shortName: 'Hellfire',
      family: 'Hellfire',
      icon: 'assets/weapon-icons/hellfire.png',
    },
  ];

  protected readonly availableStores = computed(() => {
    const types = new Set<string>(
      this.stations()
        .map((s) => s.storeType)
        .filter((t) => !!t),
    );
    // AWM/M36 stations don't get their own Select Store rows
    const mapped = new Set<string>();
    for (const t of types) {
      if (t === 'AWM' || t === 'M36') {
        // skip — AWM/M36 don't get their own Select Store rows
      } else {
        mapped.add(t);
      }
    }
    return this.storeRows.filter((r) => mapped.has(r.type));
  });

  ngOnDestroy(): void {
    this.bitTimers.forEach((t) => clearTimeout(t));
  }

  isSelected(type: StoreType): boolean {
    return this.selectedType() === type;
  }

  isStorePowered(type: StoreType): boolean {
    return this.stations().some((s) => s.storeType === type && s.storePower);
  }

  /** Returns true if the Power Off button should be disabled (GBU-12 can't be powered). */
  isPowerDisabled(type: StoreType): boolean {
    return !canBePowered(type);
  }

  selectStore(type: StoreType): void {
    if (this.selectedType() === type) {
      // Deselect
      this.selectedType.set(null);
      this.sms.selectedStationId.set(null);
    } else {
      // Deselect previous type (but don't power it down per TO)
      this.selectedType.set(type);
      const station = this.stations().find((s) => s.storeType === type);
      if (station) this.sms.selectedStationId.set(station.id);

      // If powered store, power on and run BIT sequence
      if (canBePowered(type)) {
        this.powerOnAndRunBit(type);
      }
    }
  }

  setSingle(type: StoreType): void {
    this.selectedType.set(type);
    const station = this.stations().find((s) => s.storeType === type);
    if (station) this.sms.selectedStationId.set(station.id);
  }

  protected executePowerOff(type: StoreType): void {
    this.sms.stations.update((list) =>
      list.map((s) => {
        if (s.storeType !== type) return s;
        const updated = { ...s, storePower: false, storeStatus: 'IDLE' as StoreStatus };
        if (s.substations) {
          updated.substations = s.substations.map((sub) =>
            sub.storeType === type ? { ...sub, storePower: false, storeStatus: 'IDLE' as StoreStatus } : sub,
          );
        }
        return updated;
      }),
    );
  }

  /**
   * Powers on all stations of the given type, flashes LNK green,
   * then runs the weapon-family BIT sequence.
   */
  private powerOnAndRunBit(type: StoreType): void {
    // 1. Flash LNK indicator (blinking green = processing command)
    this.sms.linkState.set('BLINK_GREEN');

    // 2. After LNK finishes blinking, power on stations and start BIT
    const t0 = setTimeout(() => {
      this.sms.linkState.set('GREEN');

      // Power on all stations of this type
      this.sms.stations.update((list) =>
        list.map((s) => {
          if (s.storeType !== type) return s;
          const updated = { ...s, storePower: true };
          if (s.substations) {
            updated.substations = s.substations.map((sub) =>
              sub.storeType === type ? { ...sub, storePower: true } : sub,
            );
          }
          return updated;
        }),
      );

      this.runBitSequence(type);
    }, 1500);
    this.bitTimers.push(t0);
  }

  /**
   * Walks through the BIT sequence for a weapon family, updating
   * storeStatus on all matching stations/substations at each step.
   */
  private runBitSequence(type: StoreType): void {
    const key = getBitKey(type);
    const steps = BIT_SEQUENCES[key] ?? BIT_SEQUENCES['GBU12'];

    let delay = 0;
    for (const step of steps) {
      const t = setTimeout(() => {
        this.setStatusForType(type, step.status);
      }, delay);
      this.bitTimers.push(t);

      if (step.durationMs > 0) {
        delay += step.durationMs;
      }
    }
  }

  private setStatusForType(type: StoreType, status: StoreStatus): void {
    this.sms.stations.update((list) =>
      list.map((s) => {
        if (s.storeType !== type) return s;
        const updated = { ...s, storeStatus: status };
        if (s.substations) {
          updated.substations = s.substations.map((sub) =>
            sub.storeType === type ? { ...sub, storeStatus: status } : sub,
          );
        }
        return updated;
      }),
    );
  }
}
