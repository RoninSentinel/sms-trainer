import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type StoreStatus =
  | 'UNVRFD' | 'INVLD' | 'REL' | 'AWAY' | 'WARN' | 'ERROR'
  | 'BIT' | 'FAILED' | 'READY' | 'IDLE' | 'HUNG' | 'JETTED' | 'JET'
  | 'MINREL' | 'DEGRD' | 'AUR' | 'IBIT' | 'WARMUP' | '';

export type StoreType =
  | 'GBU12' | 'GBU38' | 'GBU49' | 'GBU54' | 'GBU48'
  | 'Hellfire' | 'M36' | 'GBU54' | 'UAI' | 'JDAM' | '';

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

@Injectable({ providedIn: 'root' })
export class SmsService {
  lnkState$ = new BehaviorSubject<LnkState>('GREEN');
  stsState$ = new BehaviorSubject<StsState>('GREEN');

  stations$ = new BehaviorSubject<Station[]>([
    { id: 1, label: 'Station 1', storeType: 'GBU12',    storeStatus: 'IDLE',   storePower: true,  selected: false },
    { id: 2, label: 'Station 2', storeType: 'Hellfire', storeStatus: 'IDLE',   storePower: true,  selected: false,
      launcher: 'M310', substations: [
        { id: '2-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true,  selected: false },
        { id: '2-2', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true,  selected: false },
      ]},
    { id: 3, label: 'Station 3', storeType: 'GBU54',      storeStatus: 'IDLE',   storePower: false, selected: false },
    { id: 5, label: 'Station 5', storeType: 'GBU54',      storeStatus: 'IDLE',   storePower: false, selected: false },
    { id: 6, label: 'Station 6', storeType: 'Hellfire', storeStatus: 'IDLE',   storePower: true,  selected: false,
      launcher: 'M310', substations: [
        { id: '6-1', storeType: 'Hellfire', storeStatus: 'IDLE', storePower: true,  selected: false },
        { id: '6-2', storeType: 'GBU54',      storeStatus: 'IDLE', storePower: false, selected: false },
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

  selectedStationId$ = new BehaviorSubject<number | null> (null);

  getStatusClass(status: StoreStatus): string {
    switch (status) {
      case 'UNVRFD': case 'WARN': case 'MINREL': case 'DEGRD': return 'status-yellow';
      case 'INVLD': case 'ERROR': case 'FAILED': case 'HUNG':  return 'status-red';
      case 'REL': case 'AWAY': case 'BIT': case 'READY': case 'IDLE':
      case 'JET': case 'JETTED': case 'AUR': case 'IBIT': case 'WARMUP': return 'status-green';
      default: return 'status-black';
    }
  }
}
