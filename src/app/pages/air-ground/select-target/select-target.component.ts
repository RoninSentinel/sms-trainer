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
  showCreateForm = false;
  scrollOffset = 0;
  pageSize = 4;
  private subs: Subscription[] = [];

  newTarget: SavedTarget = { name: '', lat: '', lon: '', alt: '', altRef: 'MSL', source: 'Manual' };

  crossCuedTarget: SavedTarget = {
    name: 'CCTGP',
    lat: "N 44\u00b040'30.100\"",
    lon: "W 3\u00b020'09.233\"",
    alt: '1,662',
    altRef: 'MSL',
    source: 'CCTGP',
  };

  constructor(public sms: SmsService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(this.sms.savedTargets$.subscribe(t => { this.targets = t; }));
    this.subs.push(this.sms.selectedTargetName$.subscribe(n => { this.selectedTargetName = n; }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  get visibleTargets(): SavedTarget[] {
    return this.targets.slice(this.scrollOffset, this.scrollOffset + this.pageSize);
  }

  scrollUp(): void { if (this.scrollOffset > 0) this.scrollOffset--; }
  scrollDown(): void { if (this.scrollOffset + this.pageSize < this.targets.length) this.scrollOffset++; }

  selectTarget(name: string): void {
    if (this.selectedTargetName === name) {
      this.selectedTargetName = '';
      this.sms.selectedTargetName$.next('');
    } else {
      this.selectedTargetName = name;
      this.sms.selectedTargetName$.next(name);
    }
  }

  isSelected(name: string): boolean { return this.selectedTargetName === name; }

  get selectedTarget(): SavedTarget | undefined {
    return this.targets.find(t => t.name === this.selectedTargetName);
  }

  updateTarget(): void {
    // Target Update - placeholder for sensor cue update logic
  }

  createTarget(): void {
    if (!this.newTarget.name) return;
    const updated = [...this.targets, { ...this.newTarget }];
    this.sms.savedTargets$.next(updated);
    this.selectTarget(this.newTarget.name);
    this.newTarget = { name: '', lat: '', lon: '', alt: '', altRef: 'MSL', source: 'Manual' };
    this.showCreateForm = false;
  }

  deleteTarget(name: string): void {
    const updated = this.targets.filter(t => t.name !== name);
    this.sms.savedTargets$.next(updated);
    if (this.selectedTargetName === name) { this.sms.selectedTargetName$.next(''); }
  }

  back(): void { this.router.navigate(['/air-ground/store-settings']); }
  next(): void { this.router.navigate(['/air-ground/release-settings']); }
}
