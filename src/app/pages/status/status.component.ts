import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SmsService, Station } from '../../services/sms.service';

@Component({
  selector: 'app-status-page',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss'],
})
export class StatusPageComponent implements OnInit, OnDestroy {
  stations: Station[] = [];
  warnings: { level: string; msg: string }[] = [];
  activeView = 'summary';
  private subs: Subscription[] = [];

  constructor(public sms: SmsService) {}
  ngOnInit(): void {
    this.subs.push(this.sms.stations$.subscribe(s => { this.stations = s; }));
    this.subs.push(this.sms.warnings$.subscribe(w => { this.warnings = w; }));
  }
  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
  getStatusClass(s: string): string { return this.sms.getStatusClass(s as any); }
  get warningCount(): number { return this.warnings.length; }
}
