import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SmsService, Station, ReleaseSettings } from '../../../services/sms.service';

@Component({
  selector: 'app-release-settings',
  templateUrl: './release-settings.component.html',
  styleUrls: ['./release-settings.component.scss'],
})
export class ReleaseSettingsComponent implements OnInit, OnDestroy {
  stations: Station[] = [];
  selectedStationId: number | null = null;
  rel!: ReleaseSettings;
  private subs: Subscription[] = [];

  constructor(public sms: SmsService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(this.sms.stations$.subscribe(s => { this.stations = s; this.loadSettings(); }));
    this.subs.push(this.sms.selectedStationId$.subscribe(id => { this.selectedStationId = id; this.loadSettings(); }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  get selectedStation(): Station | undefined {
    return this.stations.find(s => s.id === this.selectedStationId);
  }

  get family(): string {
    const st = this.selectedStation;
    if (!st) return 'Other';
    return this.sms.getStoreFamily(st.storeType);
  }

  get canGoNext(): boolean {
    if (this.selectedStationId === null) return false;
    return this.sms.getNextStationId(this.selectedStationId) !== null;
  }

  get canGoPrev(): boolean {
    if (this.selectedStationId === null) return false;
    return this.sms.getPrevStationId(this.selectedStationId) !== null;
  }

  nextStation(): void {
    if (this.selectedStationId === null) return;
    const next = this.sms.getNextStationId(this.selectedStationId);
    if (next !== null) { this.selectedStationId = next; this.sms.selectedStationId$.next(next); this.loadSettings(); }
  }

  prevStation(): void {
    if (this.selectedStationId === null) return;
    const prev = this.sms.getPrevStationId(this.selectedStationId);
    if (prev !== null) { this.selectedStationId = prev; this.sms.selectedStationId$.next(prev); this.loadSettings(); }
  }

  loadSettings(): void {
    if (this.selectedStationId === null) return;
    this.rel = { ...this.sms.getReleaseSettings(this.selectedStationId) };
  }

  save(): void {
    if (this.selectedStationId === null) return;
    this.sms.setReleaseSettings(this.selectedStationId, { ...this.rel });
  }

  selectStation(id: number): void {
    this.selectedStationId = id;
    this.sms.selectedStationId$.next(id);
    this.loadSettings();
  }

  cycleRunInMode(): void {
    this.rel.runInMode = this.rel.runInMode === 'Manual' ? 'Auto' : 'Manual';
    this.save();
  }

  cycleWezMode(): void {
    this.rel.wezMode = this.rel.wezMode === 'Manual' ? 'Auto' : 'Manual';
    this.save();
  }

  cycleReleaseMode(): void {
    const opts: ReleaseSettings['releaseMode'][] = ['CCIP', 'CCRP', 'MAN', 'DTOS'];
    const i = opts.indexOf(this.rel.releaseMode);
    this.rel.releaseMode = opts[(i + 1) % opts.length];
    this.save();
  }

  getRippleTime(i: number): string {
    if (!this.rel) return '0.00';
    return (i * this.rel.rippleInterval).toFixed(2);
  }

  cycleCueMode(): void {
    const opts: ReleaseSettings['cueMode'][] = ['LAR', 'CCIP', 'CCRP', 'MAN'];
    const i = opts.indexOf(this.rel.cueMode);
    this.rel.cueMode = opts[(i+1)%opts.length];
    this.save();
  }

  back(): void { this.router.navigate(['/air-ground/select-target']); }
  next(): void { this.router.navigate(['/air-ground/launch-status']); }
}
