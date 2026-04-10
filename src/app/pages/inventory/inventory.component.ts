import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { SmsService, Station, StoreType, StoreStatus, LauncherType } from '../../services/sms.service';

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [NgClass],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
})
export class InventoryPageComponent {
  protected readonly sms = inject(SmsService);
  protected readonly stations = this.sms.stations;

  readonly selectedStationId = signal<number | null>(null);
  readonly verifyState = signal<'idle' | 'in-progress' | 'done'>('idle');

  storeTypeOptions: { label: string; value: StoreType; trainer: boolean; launcher?: LauncherType }[] = [
    { label: 'GBU12 Legacy',  value: 'GBU12',    trainer: false },
    { label: 'GBU49 Legacy',  value: 'GBU49',    trainer: false },
    { label: 'GBU38 Legacy',  value: 'GBU38',    trainer: false },
    { label: 'GBU12T Legacy', value: 'GBU12',    trainer: true  },
    { label: 'GBU49T Legacy', value: 'GBU49',    trainer: true  },
    { label: 'GBU38T Legacy', value: 'GBU38',    trainer: true  },
    { label: 'M310\nDual HF', value: 'Hellfire', trainer: false, launcher: 'M310' },
    { label: 'M310T HF Trn',  value: 'Hellfire', trainer: true,  launcher: 'M310' },
    { label: 'M299\nQuad HF', value: 'Hellfire', trainer: false, launcher: 'M299' },
    { label: 'M299T HF Trn',  value: 'Hellfire', trainer: true,  launcher: 'M299' },
    { label: 'GBU54',         value: 'GBU54',    trainer: false },
  ];

  protected readonly selectedStation = computed<Station | undefined>(() => {
    const id = this.selectedStationId();
    return id !== null ? this.stations().find((s) => s.id === id) : undefined;
  });

  protected readonly titleBar = computed(() =>
    this.selectedStationId() !== null ? 'Inventory: Station ' + String(this.selectedStationId()) : 'Inventory',
  );

  protected readonly canClearStore = computed(() => {
    const st = this.selectedStation();
    return st !== undefined && st.storeType !== '';
  });

  selectStation(id: number): void {
    this.selectedStationId.set(id);
    this.sms.selectedStationId.set(id);
  }

  assignStore(type: StoreType, trainer: boolean, launcher?: LauncherType): void {
    const id = this.selectedStationId();
    if (id === null) return;
    const station = this.stations().find((s) => s.id === id);
    if (!station?.loadable) return;
    // For Hellfire, pass the launcher type (defaults to M310 if not specified)
    const resolvedLauncher: LauncherType = type === 'Hellfire' ? (launcher ?? 'M310') : 'M310';
    this.sms.setStationStoreType(id, type, trainer, resolvedLauncher);
    this.sms.stations.update((list) =>
      list.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          storeStatus: 'UNVRFD' as StoreStatus,
          substations: s.substations?.map((sub) => ({
            ...sub,
            storeStatus: 'UNVRFD' as StoreStatus,
          })),
        };
      }),
    );
  }

  clearStore(): void {
    const id = this.selectedStationId();
    if (id === null) return;
    this.sms.setStationStoreType(id, '');
    this.sms.stations.update((list) => list.map((s) => (s.id === id ? { ...s, storeStatus: '' as StoreStatus } : s)));
  }

  clearStation(): void {
    this.clearStore();
    this.selectedStationId.set(null);
    this.sms.selectedStationId.set(null);
  }

  startVerify(): void {
    this.verifyState.set('in-progress');
    setTimeout(() => {
      this.verifyState.set('done');
      this.sms.stations.update((list) =>
        list.map((s) => ({
          ...s,
          storeStatus: (s.storeType ? 'IDLE' : '') as StoreStatus,
          substations: s.substations?.map((sub) => ({
            ...sub,
            storeStatus: (sub.storeType ? 'IDLE' : '') as StoreStatus,
          })),
        })),
      );
    }, 2500);
  }

  cancelVerify(): void {
    this.verifyState.set('idle');
  }
  modify(): void {
    this.verifyState.set('idle');
  }
  getStatusClass(s: StoreStatus): string {
    return this.sms.getStatusClass(s);
  }
}
