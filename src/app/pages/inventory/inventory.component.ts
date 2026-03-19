import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SmsService, Station, StoreType } from '../../services/sms.service';

@Component({
  selector: 'app-inventory-page',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
})
export class InventoryPageComponent implements OnInit, OnDestroy {
  stations: Station[] = [];
  selectedStationId: number | null = null;
  verifyState: 'idle' | 'in-progress' | 'done' = 'idle';
  private sub!: Subscription;

  storeTypeOptions: { label: string; value: StoreType; trainer: boolean }[] = [
    { label: 'GBU12 Legacy',  value: 'GBU12',    trainer: false },
    { label: 'GBU49 Legacy',  value: 'GBU49',    trainer: false },
    { label: 'JDAM Legacy',   value: 'JDAM',     trainer: false },
    { label: 'GBU12T Legacy', value: 'GBU12',    trainer: true  },
    { label: 'GBU49T Legacy', value: 'GBU49',    trainer: true  },
    { label: 'JDAMT Legacy',  value: 'JDAM',     trainer: true  },
    { label: 'M310 Dual HF',  value: 'Hellfire', trainer: false },
    { label: 'M310T HF Trn',  value: 'Hellfire', trainer: true  },
    { label: 'GBU54',           value: 'GBU54',      trainer: false },
    { label: 'UAI',           value: 'UAI',      trainer: false },
  ];

  constructor(public sms: SmsService) {}
  ngOnInit(): void { this.sub = this.sms.stations$.subscribe(s => { this.stations = s; }); }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get selectedStation(): Station | undefined {
    if (this.selectedStationId === null) { return undefined; }
    return this.stations.find(s => s.id === this.selectedStationId);
  }

  get titleBar(): string {
    return this.selectedStationId !== null
      ? 'Inventory: Station ' + String(this.selectedStationId)
      : 'Inventory';
  }

  selectStation(id: number): void { 
    this.selectedStationId = id; 
    this.sms.selectedStationId$.next(id);
  }

  assignStore(type: StoreType): void {
    if (this.selectedStationId === null) { return; }
    const id = this.selectedStationId;
    const updated = this.stations.map(s =>
      s.id === id ? { ...s, storeType: type, storeStatus: 'UNVRFD' as any } : s
    );
    this.sms.stations$.next(updated);
    this.sms.selectedStationId$.next(id);
  }

  clearStore(): void {
    if (this.selectedStationId === null) { return; }
    const id = this.selectedStationId;
    const updated = this.stations.map(s =>
      s.id === id ? { ...s, storeType: '' as any, storeStatus: '' as any } : s
    );
    this.sms.stations$.next(updated);
  }

  clearStation(): void { this.clearStore(); this.selectedStationId = null; }

  startVerify(): void {
    this.verifyState = 'in-progress';
    setTimeout(() => {
      this.verifyState = 'done';
      const updated = this.stations.map(s =>
        ({ ...s, storeStatus: s.storeType ? ('IDLE' as any) : ('' as any) })
      );
      this.sms.stations$.next(updated);
    }, 2500);
  }

  cancelVerify(): void { this.verifyState = 'idle'; }
  modify(): void { this.verifyState = 'idle'; }
  getStatusClass(s: string): string { return this.sms.getStatusClass(s as any); }

  get canClearStore(): boolean {
    const st = this.selectedStation;
    return st !== undefined && st.storeType !== '';
  }
}
