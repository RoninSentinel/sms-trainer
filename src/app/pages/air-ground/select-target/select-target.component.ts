import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SmsService, SavedTarget } from '../../../services/sms.service';

@Component({
  selector: 'app-select-target',
  templateUrl: './select-target.component.html',
  styleUrls: ['./select-target.component.scss'],
})
export class SelectTargetComponent implements OnInit, OnDestroy {
  targets: SavedTarget[] = [];
  selectedTargetName = '';
  activeTab: 'saved' | 'crosscued' | 'create' = 'saved';
  private subs: Subscription[] = [];

  newTarget: SavedTarget = { name: '', lat: '', lon: '', alt: '', altRef: 'MSL', source: 'Manual' };

  constructor(public sms: SmsService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(this.sms.savedTargets$.subscribe(t => { this.targets = t; }));
    this.subs.push(this.sms.selectedTargetName$.subscribe(n => { this.selectedTargetName = n; }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  selectTarget(name: string): void {
    this.selectedTargetName = name;
    this.sms.selectedTargetName$.next(name);
  }

  isSelected(name: string): boolean { return this.selectedTargetName === name; }

  get selectedTarget(): SavedTarget | undefined {
    return this.targets.find(t => t.name === this.selectedTargetName);
  }

  createTarget(): void {
    if (!this.newTarget.name) return;
    const updated = [...this.targets, { ...this.newTarget }];
    this.sms.savedTargets$.next(updated);
    this.selectTarget(this.newTarget.name);
    this.newTarget = { name: '', lat: '', lon: '', alt: '', altRef: 'MSL', source: 'Manual' };
    this.activeTab = 'saved';
  }

  deleteTarget(name: string): void {
    const updated = this.targets.filter(t => t.name !== name);
    this.sms.savedTargets$.next(updated);
    if (this.selectedTargetName === name) { this.sms.selectedTargetName$.next(''); }
  }

  back(): void { this.router.navigate(['/air-ground/store-settings']); }
  next(): void { this.router.navigate(['/air-ground/release-settings']); }
}
