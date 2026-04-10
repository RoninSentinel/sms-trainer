import { Component, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SmsService } from './services/sms.service';
import { LoadoutDisplayComponent } from './components/shared/loadout-display/loadout-display.component';
import { MenuBar, Menu, MenuItem, MenuTrigger, MenuContent } from '@angular/aria/menu';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet, LoadoutDisplayComponent, MenuBar, Menu, MenuItem, OverlayModule, MenuTrigger, MenuContent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private readonly router = inject(Router);
  protected readonly sms = inject(SmsService);

  navItems = [
    { label: 'Air-Ground', path: '/air-ground' },
    { label: 'Profiles', path: '/profiles' },
    { label: 'Status', path: '/status' },
    { label: 'Sel Jettison', path: '/selective-jettison' },
    { label: 'Inventory', path: '/inventory' },
  ];

  protected readonly lnkClass = computed<Record<string, boolean>>(() => {
    const state = this.sms.linkState();
    return {
      'ind-green': state === 'GREEN',
      'ind-blink-green': state === 'BLINK_GREEN',
      'ind-blink-yellow': state === 'BLINK_YELLOW',
      'ind-red': state === 'RED',
    };
  });

  protected readonly stsClass = computed<Record<string, boolean>>(() => {
    const state = this.sms.stsState();
    return {
      'ind-green': state === 'GREEN',
      'ind-red': state === 'RED',
      'ind-blink-red': state === 'BLINK_RED',
      'ind-yellow': state === 'YELLOW',
      'ind-blink-yellow': state === 'BLINK_YELLOW',
    };
  });
 
  newSession(): void {
    console.log('New session');
  }

  saveSession(): void {
    console.log('Save session');
  }

  exitApp(): void {
    console.log('Exit app');
  }

  goStatus(): void {
    this.router.navigate(['/status']);
  }

  goAirGround(): void {
    this.router.navigate(['/air-ground/select-store']);
  }

  goInventory(): void {
    this.router.navigate(['/inventory']);
  }

  goProfiles(): void {
    this.router.navigate(['/profiles']);
  }

  goSelJettison(): void {
    this.router.navigate(['/selective-jettison']);
  }

  openAbout(): void {
    alert('SMS Trainer\nVersion 1.0');
  }

}
