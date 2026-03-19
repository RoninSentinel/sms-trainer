import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SmsService } from '../../services/sms.service';

@Component({
  selector: 'app-profiles-page',
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.scss'],
})
export class ProfilesPageComponent implements OnInit, OnDestroy {
  profiles: any[] = [];
  activeView = 'overview';
  selectedProfileId = 1;
  storeOptions = ['GBU12', 'GBU49', 'JDAM', 'Hellfire', 'GBU48', 'AWM'];
  private sub!: Subscription;

  constructor(public sms: SmsService) {}
  ngOnInit(): void { this.sub = this.sms.profiles$.subscribe(p => { this.profiles = p; }); }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get selectedProfile(): any {
    const found = this.profiles.find(p => p.id === this.selectedProfileId);
    return found ? found : {};
  }

  get titleBar(): string {
    const p = this.selectedProfile;
    if (!p.id) { return 'Profiles'; }
    return p.active ? 'Profile: ACTIVE' : 'Profile: ' + String(this.selectedProfileId);
  }

  selectProfile(id: number): void { this.selectedProfileId = id; this.activeView = 'overview'; }

  activateProfile(id: number): void {
    const updated = this.profiles.map(p => ({ ...p, active: p.id === id }));
    this.sms.profiles$.next(updated);
  }

  updateField(field: string, value: any): void {
    const updated = this.profiles.map(p =>
      p.id === this.selectedProfileId ? { ...p, [field]: value } : p
    );
    this.sms.profiles$.next(updated);
  }

  clearProfile(): void {
    ['storeType', 'target', 'prf'].forEach(f => this.updateField(f, ''));
  }
}
