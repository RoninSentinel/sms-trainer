import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SmsService, Station } from '../../services/sms.service';

@Component({
  selector: 'app-selective-jettison-page',
  templateUrl: './selective-jettison.component.html',
  styleUrls: ['./selective-jettison.component.scss'],
})
export class SelectiveJettisonPageComponent implements OnInit, OnDestroy {
  stations: Station[] = [];
  selectedIdSet: number[] = [];
  jettisoned: number[] = [];
  jettExecuted = false;
  private sub!: Subscription;

  constructor(public sms: SmsService) {}
  ngOnInit(): void { this.sub = this.sms.stations$.subscribe(s => { this.stations = s; }); }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  isSelected(id: number): boolean { return this.selectedIdSet.includes(id); }
  isJettisoned(id: number): boolean { return this.jettisoned.includes(id); }

  toggleSelect(id: number): void {
    const idx = this.selectedIdSet.indexOf(id);
    if (idx >= 0) { this.selectedIdSet.splice(idx, 1); }
    else { this.selectedIdSet.push(id); }
  }

  get selectedCount(): number { return this.selectedIdSet.length; }

  executeJettison(): void {
    const ids = [...this.selectedIdSet];
    const updated = this.stations.map(s =>
      ids.includes(s.id) ? { ...s, storeStatus: 'JETTED' as any, storeType: '' as any } : s
    );
    this.jettisoned = ids;
    this.selectedIdSet = [];
    this.jettExecuted = true;
    this.sms.stations$.next(updated);
  }

  cancelJettison(): void { this.selectedIdSet = []; this.jettExecuted = false; }
  getStatusClass(s: string): string { return this.sms.getStatusClass(s as any); }
}
