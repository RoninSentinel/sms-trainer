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
  selectedType: StoreType | null = null;
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
    // restore selection from service if already set
    const currentId = this.sms.selectedStationId$.value;
    if (currentId !== null) {
      const station = this.stations.find(s => s.id === currentId);
      if (station) this.selectedType = station.storeType;
    }
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  getAvailableStores() {
    const types = new Set(this.stations.map(s => s.storeType).filter(t => !!t));
    return this.storeRows.filter(r => types.has(r.type));
  }

  isSelected(type: StoreType): boolean {
    return this.selectedType === type;
  }

  isStorePowered(type: StoreType): boolean {
    return this.stations.some(s => s.storeType === type && s.storePower);
  }

  selectStore(type: StoreType): void {
    if (this.selectedType === type) {
      // Deselect
      this.selectedType = null;
      this.sms.selectedStationId$.next(null);
    } else {
      // Select this one, deselect all others
      this.selectedType = type;
      const station = this.stations.find(s => s.storeType === type);
      if (station) this.sms.selectedStationId$.next(station.id);
    }
  }

  setSingle(type: StoreType): void {
    // Select single store without navigating away
    this.selectedType = type;
    const station = this.stations.find(s => s.storeType === type);
    if (station) this.sms.selectedStationId$.next(station.id);
  }

  togglePower(type: StoreType): void {
    const updated = this.stations.map(s =>
      s.storeType === type ? { ...s, storePower: !s.storePower } : s
    );
    this.sms.stations$.next(updated);
  }
}
