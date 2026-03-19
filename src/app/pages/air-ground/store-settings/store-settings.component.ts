import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SmsService, Station, GbuSettings, JdamSettings, HellfireSettings } from '../../../services/sms.service';

@Component({
  selector: 'app-store-settings',
  templateUrl: './store-settings.component.html',
  styleUrls: ['./store-settings.component.scss'],
})
export class StoreSettingsComponent implements OnInit, OnDestroy {
  stations: Station[] = [];
  selectedStationId: number | null = null;
  private subs: Subscription[] = [];

  gbu!: GbuSettings;
  jdam!: JdamSettings;
  hf!: HellfireSettings;

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

  get titleBar(): string {
    return this.selectedStation
      ? 'Store Settings: Sta ' + this.selectedStationId + ' (' + this.selectedStation.storeType + ')'
      : 'Store Settings';
  }

  selectStation(id: number): void {
    this.selectedStationId = id;
    this.sms.selectedStationId$.next(id);
    this.loadSettings();
  }

  loadSettings(): void {
    if (this.selectedStationId === null) return;
    const id = this.selectedStationId;
    this.gbu  = { ...this.sms.getGbuSettings(id) };
    this.jdam = { ...this.sms.getJdamSettings(id) };
    this.hf   = { ...this.sms.getHellfireSettings(id) };
  }

  saveGbu(): void {
    if (this.selectedStationId === null) return;
    this.sms.setGbuSettings(this.selectedStationId, { ...this.gbu });
  }

  saveJdam(): void {
    if (this.selectedStationId === null) return;
    this.sms.setJdamSettings(this.selectedStationId, { ...this.jdam });
  }

  saveHf(): void {
    if (this.selectedStationId === null) return;
    this.sms.setHellfireSettings(this.selectedStationId, { ...this.hf });
  }

  back(): void { this.router.navigate(['/air-ground/select-store']); }
  next(): void { this.router.navigate(['/air-ground/select-target']); }

  toggleGbuFuze(): void { this.gbu.fuzeArm = this.gbu.fuzeArm === 'SAFE' ? 'ARM' : 'SAFE'; this.saveGbu(); }
  toggleJdamFuze(): void { this.jdam.fuzeArm = this.jdam.fuzeArm === 'SAFE' ? 'ARM' : 'SAFE'; this.saveJdam(); }
  cycleJdamFuzing(): void {
    const opts: JdamSettings['fuzingType'][] = ['INST','DELAY','PROX'];
    const i = opts.indexOf(this.jdam.fuzingType);
    this.jdam.fuzingType = opts[(i+1)%opts.length];
    this.saveJdam();
  }
  cycleGbuFuzing(): void {
    const opts: GbuSettings['fuzingType'][] = ['INST','DELAY','PROX'];
    const i = opts.indexOf(this.gbu.fuzingType);
    this.gbu.fuzingType = opts[(i+1)%opts.length];
    this.saveGbu();
  }
  cycleHfSeeker(): void {
    this.hf.seekerMode = this.hf.seekerMode === 'LOBL' ? 'LOAL' : 'LOBL';
    this.saveHf();
  }
  cycleHfWarhead(): void {
    const opts: HellfireSettings['warheadType'][] = ['K-HEAT','BLAST-FRAG','THERMOBARIC'];
    const i = opts.indexOf(this.hf.warheadType);
    this.hf.warheadType = opts[(i+1)%opts.length];
    this.saveHf();
  }
  cycleHfMotor(): void {
    const opts: HellfireSettings['rocketMotor'][] = ['AGM-114K','AGM-114R','AGM-114N'];
    const i = opts.indexOf(this.hf.rocketMotor);
    this.hf.rocketMotor = opts[(i+1)%opts.length];
    this.saveHf();
  }
}
