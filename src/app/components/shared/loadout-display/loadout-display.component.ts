import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SmsService, Station } from '../../../services/sms.service';

@Component({
  selector: 'app-loadout-display',
  templateUrl: './loadout-display.component.html',
  styleUrls: ['./loadout-display.component.scss'],
})
export class LoadoutDisplayComponent implements OnInit, OnDestroy {
  stations: Station[] = [];
  activeStationId: number | null = null;  // ← ADD
  private subs: Subscription[] = [];

  constructor(private sms: SmsService) {}

  ngOnInit(): void {
    this.subs.push(this.sms.stations$.subscribe(s => { this.stations = s; }));
    this.subs.push(this.sms.selectedStationId$.subscribe(id => { this.activeStationId = id; }));  // ← ADD
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  getStatusClass(s: string): string { return this.sms.getStatusClass(s as any); }

  selectStation(station: Station): void {
    this.sms.selectedStationId$.next(station.id);  // ← REPLACE previous toggle logic
    this.activeStationId = station.id;
  }
}
