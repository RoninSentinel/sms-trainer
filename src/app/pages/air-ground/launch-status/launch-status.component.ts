import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SmsService, Station } from '../../../services/sms.service';

@Component({
  selector: 'app-launch-status',
  templateUrl: './launch-status.component.html',
  styleUrls: ['./launch-status.component.scss'],
})
export class LaunchStatusComponent implements OnInit, OnDestroy {
  stations: Station[] = [];
  selectedTargetName = '';
  selectedStationId: number | null = null;
  autoUpdate = true;
  manualUpdate = false;
  private subs: Subscription[] = [];

  constructor(public sms: SmsService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(this.sms.stations$.subscribe(s => { this.stations = s; }));
    this.subs.push(this.sms.selectedTargetName$.subscribe(n => { this.selectedTargetName = n; }));
    this.subs.push(this.sms.selectedStationId$.subscribe(id => { this.selectedStationId = id; }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  get selectedStation(): Station | undefined {
    return this.stations.find(s => s.id === this.selectedStationId);
  }

  get family(): string {
    const st = this.selectedStation;
    if (!st) return 'GBU';
    return this.sms.getStoreFamily(st.storeType);
  }

  get armedStations(): Station[] {
    return this.stations.filter(s => s.storeType && s.storePower);
  }

  get isStorePowered(): boolean {
    return this.selectedStation?.storePower ?? false;
  }

  get storeSettingsCorrect(): boolean { return true; }

  get targetSelected(): boolean {
    return !!this.selectedTargetName;
  }

  get fuzeArmed(): boolean {
    if (!this.selectedStationId) return false;
    return this.sms.getGbuSettings(this.selectedStationId).fuzeArm === 'ARM';
  }

  get readyForLaunch(): boolean {
    return this.isStorePowered && this.targetSelected;
  }

  getPrf(stationId: number): string {
    const station = this.stations.find(s => s.id === stationId);
    if (!station) return '--';
    const family = this.sms.getStoreFamily(station.storeType);
    if (family === 'Hellfire') return this.sms.getHellfireSettings(stationId).laserCode;
    if (family === 'GBU') return this.sms.getGbuSettings(stationId).prf;
    return '--';
  }

  back(): void { this.router.navigate(['/air-ground/release-settings']); }
}
