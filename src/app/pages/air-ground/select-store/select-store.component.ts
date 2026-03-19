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
  private subs: Subscription[] = [];

  storeRows: { type: StoreType; label: string; shortName: string; family: string }[] = [
    { type: 'GBU12',    label: 'GBU-12 Paveway II',  shortName: 'GB12', family: 'GBU' },
    { type: 'GBU49',    label: 'GBU-49 Enhanced PW', shortName: 'GB49', family: 'GBU' },
    { type: 'GBU48',    label: 'GBU-48 Hybrid',      shortName: 'GB48', family: 'GBU' },
    { type: 'JDAM',     label: 'GBU-38 JDAM',        shortName: 'JD38', family: 'JDAM' },
    { type: 'Hellfire', label: 'AGM-114 Hellfire',   shortName: 'HF-P', family: 'Hellfire' },
  ];

  constructor(public sms: SmsService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(this.sms.stations$.subscribe(s => { this.stations = s; }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  getAvailableStores() {
    const types = new Set(this.stations.map(s => s.storeType).filter(t => !!t));
    return this.storeRows.filter(r => types.has(r.type));
  }

  isAnyStationAssigned(type: StoreType): boolean {
    return this.stations.some(s => s.storeType === type && s.storePower);
  }

  isStorePowered(type: StoreType): boolean {
    return this.stations.some(s => s.storeType === type && s.storePower);
  }

  assignStore(type: StoreType): void {
    const station = this.stations.find(s => s.storeType === type);
    if (!station) return;
    this.sms.selectedStationId$.next(station.id);
    this.router.navigate(['/air-ground/store-settings']);
  }

  togglePower(type: StoreType): void {
    const updated = this.stations.map(s =>
      s.storeType === type ? { ...s, storePower: !s.storePower } : s
    );
    this.sms.stations$.next(updated);
  }
}
