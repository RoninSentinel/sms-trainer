import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SmsService, Station, ReleaseSettings } from '../../../services/sms.service';

@Component({
  selector: 'app-launch-status',
  templateUrl: './launch-status.component.html',
  styleUrls: ['./launch-status.component.scss'],
})
export class LaunchStatusComponent implements OnInit, OnDestroy {
  stations: Station[] = [];
  selectedTargetName = '';
  private subs: Subscription[] = [];

  constructor(public sms: SmsService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(this.sms.stations$.subscribe(s => { this.stations = s; }));
    this.subs.push(this.sms.selectedTargetName$.subscribe(n => { this.selectedTargetName = n; }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  getRelease(stationId: number): ReleaseSettings { return this.sms.getReleaseSettings(stationId); }
  getFamily(station: Station): string { return this.sms.getStoreFamily(station.storeType); }
  getStatusClass(s: string): string { return this.sms.getStatusClass(s as any); }

  get selectedTarget() {
    return this.sms.savedTargets$.value.find(t => t.name === this.selectedTargetName);
  }

  get armedStations(): Station[] {
    return this.stations.filter(s => s.storeType && s.storePower);
  }

  back(): void { this.router.navigate(['/air-ground/release-settings']); }
}
