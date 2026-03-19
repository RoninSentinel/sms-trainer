import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SmsService, Station, StoreType } from '../../../services/sms.service';

@Component({
  selector: 'app-select-store',
  templateUrl: './select-store.component.html',
  styleUrls: ['./select-store.component.scss'],
})
export class SelectStoreComponent implements OnInit, OnDestroy {
  stations: Station[] = [];
  selectedStationId: number | null = null;
  private subs: Subscription[] = [];

  storeRows: { type: StoreType; label: string; family: string }[] = [
    { type: 'GBU12',    label: 'GBU-12 (LGB)',     family: 'GBU' },
    { type: 'GBU49',    label: 'GBU-49 (LGB/GPS)', family: 'GBU' },
    { type: 'GBU48',    label: 'GBU-48 (LGB/GPS)', family: 'GBU' },
    { type: 'JDAM',     label: 'GBU-38 JDAM',      family: 'JDAM' },
    { type: 'Hellfire', label: 'AGM-114 Hellfire',  family: 'Hellfire' },
  ];

  constructor(public sms: SmsService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(this.sms.stations$.subscribe(s => { this.stations = s; }));
    this.subs.push(this.sms.selectedStationId$.subscribe(id => { this.selectedStationId = id; }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  selectStation(id: number): void {
    this.selectedStationId = id;
    this.sms.selectedStationId$.next(id);
  }

  get selectedStation(): Station | undefined {
    return this.stations.find(s => s.id === this.selectedStationId);
  }

  get selectedFamily(): string {
    const st = this.selectedStation;
    if (!st || !st.storeType) return '';
    return this.sms.getStoreFamily(st.storeType);
  }

  isStationSelected(type: StoreType): boolean {
    return this.selectedStation?.storeType === type;
  }

  assignStore(type: StoreType): void {
    if (this.selectedStationId === null) return;
    const id = this.selectedStationId;
    const updated = this.stations.map(s =>
      s.id === id ? { ...s, storeType: type, storeStatus: 'IDLE' as any } : s
    );
    this.sms.stations$.next(updated);
    this.sms.selectedStationId$.next(id);
    this.router.navigate(['/air-ground/store-settings']);
  }

  setPower(on: boolean): void {
    if (this.selectedStationId === null) return;
    const id = this.selectedStationId;
    const updated = this.stations.map(s =>
      s.id === id ? { ...s, storePower: on } : s
    );
    this.sms.stations$.next(updated);
  }
}
