import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SmsService, Profile } from '../../services/sms.service';

@Component({
  selector: 'app-profiles-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.scss'],
})
export class ProfilesPageComponent {
  private readonly sms = inject(SmsService);

  protected readonly profiles = this.sms.profiles;
  activeView = 'overview';
  selectedProfileId = signal(1);
  storeOptions = ['GBU12', 'GBU38', 'GBU49', 'Hellfire', 'GBU48', 'AWM'];

  protected readonly selectedProfile = computed<Partial<Profile>>(() => {
    const found = this.profiles().find((p) => p.id === this.selectedProfileId());
    return found ?? {};
  });

  protected readonly titleBar = computed(() => {
    const p = this.selectedProfile();
    if (!p.id) return 'Profiles';
    return p.active ? 'Profile: ACTIVE' : 'Profile: ' + String(this.selectedProfileId());
  });

  selectProfile(id: number): void {
    this.selectedProfileId.set(id);
    this.activeView = 'overview';
  }

  activateProfile(id: number): void {
    this.sms.profiles.update((list) => list.map((p) => ({ ...p, active: p.id === id })));
  }

  updateField(field: string, value: string): void {
    const selId = this.selectedProfileId();
    this.sms.profiles.update((list) => list.map((p) => (p.id === selId ? { ...p, [field]: value } : p)));
  }

  clearProfile(): void {
    ['storeType', 'target', 'prf'].forEach((f) => this.updateField(f, ''));
  }
}
