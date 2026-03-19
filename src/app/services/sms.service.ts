import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type StoreStatus =
  | 'UNVRFD' | 'INVLD' | 'REL' | 'AWAY' | 'WARN' | 'ERROR'
  | 'BIT' | 'FAILED' | 'READY' | 'IDLE' | 'HUNG' | 'JETTED' | 'JET'
  | 'MINREL' | 'DEGRD' | 'AUR' | 'IBIT' | 'WARMUP' | '';

export type StoreType =
  | 'GBU12' | 'GBU38' | 'GBU49' | 'GBU54' | 'GBU48'
  | 'Hellfire' | 'M36' | 'AWM' | 'UAI' | 'JDAM' | '';

export interface SubStation {
  id: string;
  storeType: StoreType;
  storeStatus: StoreStatus;
  storePower: boolean;
  selected: boolean;
}

export interface Station {
  id: number;
  label: string;
  storeType: StoreType;
  storeStatus: StoreStatus;
  storePower: boolean;
  selected: boolean;
  substations?: SubStation[];
  launcher?: string;
}

export type LnkState = 'RED' | 'BLINK_YELLOW' | 'GREEN' | 'BLINK_GREEN';
export type StsState = 'RED' | 'BLINK_RED' | 'YELLOW' | 'BLINK_YELLOW' | 'GREEN';

export interface GbuSettings {
  prf: string;
  laserReceiver: boolean;
  impactAngle: number;
  offsetN: number;
  offsetE: number;
  offsetD: number;
  fuzeArm: 'SAFE' | 'ARM';
  fuzingType: 'NOSE' | 'TAIL' | 'NOSE/TAIL';
  guidanceMode: 'LGB' | 'GPS' | 'INS';
}

export interface JdamSettings {
  guidanceMode: 'GPS' | 'INS' | 'GPS/INS';
  impactAngle: number;
  offsetN: number;
  offsetE: number;
  offsetD: number;
  fuzeArm: 'SAFE' | 'ARM';
  fuzingType: 'INST' | 'DELAY' | 'PROX';
  terminalMode: 'VERTICAL' | 'OBLIQUE';
}

export interface HellfireSettings {
  laserCode: string;
  seekerMode: 'LOAL' | 'LOBL';
  launchMode: 'LOAL-High' | 'LOAL-Low' | 'LOBL';
  tmPower: boolean;
  laserSpotTracker: boolean;
  warheadType: 'K-HEAT' | 'BLAST-FRAG' | 'THERMOBARIC';
  rocketMotor: 'AGM-114K' | 'AGM-114R' | 'AGM-114N';
  salvoPulse: number;
}

export interface ReleaseSettings {
  rippleCount: number;
  rippleInterval: number;
  releaseOrder: string[];
  cueMode: 'LAR' | 'CCIP' | 'CCRP' | 'MAN';
  targetType: 'Stationary' | 'Moving';
  runInMode: 'Manual' | 'Auto';
  runInCourse: number;
  wezMode: 'Manual' | 'Auto';
  rtiAzimuth: number;
  releaseDistMin: number;
  releaseDistDesired: number;
  releaseDistMax: number;
  releaseMode: 'CCIP' | 'CCRP' | 'MAN' | 'DTOS';
}

export interface SavedTarget {
  name: string;
  lat: string;
  lon: string;
  alt: string;
  altRef: 'MSL' | 'AGL';
  source: 'Manual' | 'Nav' | 'TGP' | 'SADL';
}

@Injectable({ providedIn: 'root' })
export class SmsService {
  lnkState$ = new BehaviorSubject<LnkState>('GREEN');
  stsState$ = new BehaviorSubject<StsState>('GREEN');
  selectedStationId$ = new BehaviorSubject<number | null>(null);

  stations$ = new BehaviorSubject<Station[]>([
    { id: 1, label: 'Station 1', storeType: 'GBU12',    storeStatus: 'IDLE',   storePower: true,  selected: false },
    { id: 2, label: 'Station 2', storeType: 'Hellfire', storeStatus: 'IDLE',   storePower: true,  selected: false,
      launcher: 'M310', substations: [
        { id: '2-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true,  selected: false },
        { id: '2-2', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true,  selected: false },
      ]},
    { id: 3, label: 'Station 3', storeType: 'AWM',      storeStatus: 'IDLE',   storePower: false, selected: false },
    { id: 5, label: 'Station 5', storeType: 'AWM',      storeStatus: 'IDLE',   storePower: false, selected: false },
    { id: 6, label: 'Station 6', storeType: 'Hellfire', storeStatus: 'IDLE',   storePower: true,  selected: false,
      launcher: 'M310', substations: [
        { id: '6-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true,  selected: false },
        { id: '6-2', storeType: 'AWM',      storeStatus: 'IDLE', storePower: false, selected: false },
      ]},
    { id: 7, label: 'Station 7', storeType: 'GBU49',    storeStatus: 'UNVRFD', storePower: false, selected: false },
  ]);

  profiles$ = new BehaviorSubject<any[]>(
    Array(8).fill(null).map((_, i) => ({
      id: i + 1, storeType: '', target: '', prf: '', active: i === 0, enabled: i === 0,
    }))
  );

  warnings$ = new BehaviorSubject<{ level: 'WARNING' | 'CAUTION'; msg: string }[]>([
    { level: 'CAUTION', msg: 'JPF Not Present - Station 7' },
  ]);

  gbuSettings$ = new BehaviorSubject<Record<number, GbuSettings>>({});
  jdamSettings$ = new BehaviorSubject<Record<number, JdamSettings>>({});
  hellfireSettings$ = new BehaviorSubject<Record<number, HellfireSettings>>({});
  releaseSettings$ = new BehaviorSubject<Record<number, ReleaseSettings>>({});

  savedTargets$ = new BehaviorSubject<SavedTarget[]>([
    { name: 'TARGET 01', lat: 'N 34 36 00.000', lon: 'W 103 40 00.000', alt: '0',   altRef: 'MSL', source: 'Manual' },
    { name: 'TARGET 02', lat: 'N 34 40 12.500', lon: 'W 103 35 44.200', alt: '250', altRef: 'AGL', source: 'TGP' },
    { name: 'TARGET 03', lat: 'N 34 28 55.000', lon: 'W 103 50 10.000', alt: '100', altRef: 'MSL', source: 'SADL' },
  ]);

  selectedTargetName$ = new BehaviorSubject<string>('TARGET 01');

  eoir = { lat: "N 44° 40' 30.975\"", lon: "W 2° 37' 20.10\"", alt: 1000, altRef: 'MSL' };
  mtsPrf = '1122';

  defaultGbu(): GbuSettings {
    return { prf: '1511', laserReceiver: true, impactAngle: 65,
             offsetN: 0, offsetE: 0, offsetD: 0, fuzeArm: 'SAFE',
             fuzingType: 'NOSE/TAIL', guidanceMode: 'LGB' };
  }

  defaultJdam(): JdamSettings {
    return { guidanceMode: 'GPS/INS', impactAngle: 90,
             offsetN: 0, offsetE: 0, offsetD: 0, fuzeArm: 'SAFE',
             fuzingType: 'INST', terminalMode: 'VERTICAL' };
  }

  defaultHellfire(): HellfireSettings {
    return { laserCode: '1122', seekerMode: 'LOBL', launchMode: 'LOAL-High',
             tmPower: false, laserSpotTracker: true,
             warheadType: 'K-HEAT', rocketMotor: 'AGM-114K', salvoPulse: 1 };
  }

  defaultRelease(): ReleaseSettings {
    return { rippleCount: 1, rippleInterval: 0.32,
             releaseOrder: ['Store 2-1', 'Store 6-1', 'Store 2-2', 'Store 6-2'],
             cueMode: 'LAR', targetType: 'Stationary',
             runInMode: 'Manual', runInCourse: 0,
             wezMode: 'Manual', rtiAzimuth: 0,
             releaseDistMin: 0, releaseDistDesired: 0, releaseDistMax: 0,
             releaseMode: 'CCRP' };
  }

  getGbuSettings(stationId: number): GbuSettings {
    const map = this.gbuSettings$.value;
    if (!map[stationId]) { map[stationId] = this.defaultGbu(); this.gbuSettings$.next({ ...map }); }
    return map[stationId];
  }

  setGbuSettings(stationId: number, s: GbuSettings): void {
    this.gbuSettings$.next({ ...this.gbuSettings$.value, [stationId]: s });
  }

  getJdamSettings(stationId: number): JdamSettings {
    const map = this.jdamSettings$.value;
    if (!map[stationId]) { map[stationId] = this.defaultJdam(); this.jdamSettings$.next({ ...map }); }
    return map[stationId];
  }

  setJdamSettings(stationId: number, s: JdamSettings): void {
    this.jdamSettings$.next({ ...this.jdamSettings$.value, [stationId]: s });
  }

  getHellfireSettings(stationId: number): HellfireSettings {
    const map = this.hellfireSettings$.value;
    if (!map[stationId]) { map[stationId] = this.defaultHellfire(); this.hellfireSettings$.next({ ...map }); }
    return map[stationId];
  }

  setHellfireSettings(stationId: number, s: HellfireSettings): void {
    this.hellfireSettings$.next({ ...this.hellfireSettings$.value, [stationId]: s });
  }

  getReleaseSettings(stationId: number): ReleaseSettings {
    const map = this.releaseSettings$.value;
    if (!map[stationId]) { map[stationId] = this.defaultRelease(); this.releaseSettings$.next({ ...map }); }
    return map[stationId];
  }

  setReleaseSettings(stationId: number, s: ReleaseSettings): void {
    this.releaseSettings$.next({ ...this.releaseSettings$.value, [stationId]: s });
  }

  getStoreFamily(type: StoreType): 'GBU' | 'JDAM' | 'Hellfire' | 'Other' {
    if (['GBU12', 'GBU38', 'GBU49', 'GBU54', 'GBU48'].includes(type)) return 'GBU';
    if (type === 'JDAM') return 'JDAM';
    if (type === 'Hellfire') return 'Hellfire';
    return 'Other';
  }

  getStatusClass(status: StoreStatus): string {
    switch (status) {
      case 'UNVRFD': case 'WARN': case 'MINREL': case 'DEGRD': return 'status-yellow';
      case 'INVLD': case 'ERROR': case 'FAILED': case 'HUNG':  return 'status-red';
      case 'REL': case 'AWAY': case 'BIT': case 'READY': case 'IDLE':
      case 'JET': case 'JETTED': case 'AUR': case 'IBIT': case 'WARMUP': return 'status-green';
      default: return 'status-black';
    }
  }

  getArmedStations(): Station[] {
    return this.stations$.value.filter(s => s.storeType && s.storePower);
  }

  getStationIndex(stationId: number): number {
    return this.stations$.value.findIndex(s => s.id === stationId);
  }

  getNextStationId(stationId: number): number | null {
    const stations = this.stations$.value;
    const idx = stations.findIndex(s => s.id === stationId);
    return idx < stations.length - 1 ? stations[idx + 1].id : null;
  }

  getPrevStationId(stationId: number): number | null {
    const stations = this.stations$.value;
    const idx = stations.findIndex(s => s.id === stationId);
    return idx > 0 ? stations[idx - 1].id : null;
  }
}
