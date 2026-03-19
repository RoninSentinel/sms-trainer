import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SmsService, LnkState, StsState } from './services/sms.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  lnkState: LnkState = 'GREEN';
  stsState: StsState = 'GREEN';
  private subs: Subscription[] = [];

  navItems = [
    { label: 'Air-Ground',   path: '/air-ground' },
    { label: 'Profiles',     path: '/profiles' },
    { label: 'Status',       path: '/status' },
    { label: 'Sel Jettison', path: '/selective-jettison' },
    { label: 'Inventory',    path: '/inventory' },
  ];

  constructor(public sms: SmsService) {}

  ngOnInit(): void {
    this.subs.push(this.sms.lnkState$.subscribe(s => { this.lnkState = s; }));
    this.subs.push(this.sms.stsState$.subscribe(s => { this.stsState = s; }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  getLnkClass(): Record<string, boolean> {
    return {
      'ind-green':        this.lnkState === 'GREEN',
      'ind-blink-green':  this.lnkState === 'BLINK_GREEN',
      'ind-blink-yellow': this.lnkState === 'BLINK_YELLOW',
      'ind-red':          this.lnkState === 'RED',
    };
  }

  getStsClass(): Record<string, boolean> {
    return {
      'ind-green':        this.stsState === 'GREEN',
      'ind-red':          this.stsState === 'RED',
      'ind-blink-red':    this.stsState === 'BLINK_RED',
      'ind-yellow':       this.stsState === 'YELLOW',
      'ind-blink-yellow': this.stsState === 'BLINK_YELLOW',
    };
  }
}
