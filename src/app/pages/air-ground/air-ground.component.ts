import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SmsService, Station, StoreType } from '../../services/sms.service';

@Component({
  selector: 'app-air-ground-page',
  templateUrl: './air-ground.component.html',
  styleUrls: ['./air-ground.component.scss'],
})
export class AirGroundPageComponent implements OnInit, OnDestroy {
  activeControl = 'store';
  stations: Station[] = [];
  selectedType: StoreType | '' = '';
  rippleCount = 1;
  rippleInterval = 0.32;
  releaseOrder: string[] = ['Store 2-1', 'Store 6-1', 'Store 2-2', 'Store 6-2'];
  fuzeArm = 'SAFE';
  fuzingType = 'INST';
  prf = '1688';
  impactAngle = 65;
  offsetN = 0; offsetE = 0; offsetD = 0;
  laserReceiver = true;
  laserMode = 'Long LPL Stationary';
  targetName = 'TARGET 01';
  targetLat = 'N 34 36 00.000';
  targetLon = 'W 103 40 00.000';
  targetAlt = '0 feet MSL';
  private sub!: Subscription;

  storeRows: { type: StoreType; label: string }[] = [
    { type: 'GBU12',    label: 'GBU-12' },
    { type: 'GBU49',    label: 'GBU-49' },
    { type: 'JDAM',     label: 'JDAM' },
    { type: 'Hellfire', label: 'Hellfire' },
    { type: 'GBU48',    label: 'GBU-48' },
  ];

  constructor(public sms: SmsService) {}
  ngOnInit(): void { this.sub = this.sms.stations$.subscribe(s => { this.stations = s; }); }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  selectType(t: StoreType): void { this.selectedType = this.selectedType === t ? '' : t; }

  get titleBar(): string {
    const labels: Record<string, string> = {
      store:    'Air To Ground: Select Store',
      settings: 'Air To Ground: Store Settings',
      target:   'Air To Ground: Select Target',
      release:  'Air To Ground: Release Settings',
      launch:   'Air To Ground: Launch Status',
    };
    return labels[this.activeControl] || 'Air To Ground';
  }

  toggleFuzeArm(): void { this.fuzeArm = this.fuzeArm === 'SAFE' ? 'ARM' : 'SAFE'; }
  toggleFuzing(): void { this.fuzingType = this.fuzingType === 'INST' ? 'DELAY' : 'INST'; }
  toggleLaser(): void { this.laserReceiver = !this.laserReceiver; }

  getRippleTime(i: number): string { return (i * this.rippleInterval).toFixed(2); }
}
