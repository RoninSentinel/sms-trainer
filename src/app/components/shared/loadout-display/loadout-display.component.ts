import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { SmsService, Station, StoreStatus, StoreType } from '../../../services/sms.service';

const STORE_ICONS: Partial<Record<StoreType, string>> = {
  GBU12: 'assets/weapon-icons/GBU.png',
  GBU38: 'assets/weapon-icons/GBU.png',
  GBU48: 'assets/weapon-icons/GBU.png',
  GBU49: 'assets/weapon-icons/GBU.png',
  GBU54: 'assets/weapon-icons/GBU.png',
  Hellfire: 'assets/weapon-icons/hellfire.png',
};

@Component({
  selector: 'app-loadout-display',
  standalone: true,
  imports: [NgClass],
  templateUrl: './loadout-display.component.html',
  styleUrls: ['./loadout-display.component.scss'],
})
export class LoadoutDisplayComponent {
  private readonly sms = inject(SmsService);

  protected readonly stations = this.sms.stations;
  protected readonly activeStationId = this.sms.selectedStationId;

  getStatusClass(s: StoreStatus): string {
    return this.sms.getStatusClass(s);
  }

  getStoreIcon(type: StoreType): string | null {
    return STORE_ICONS[type] ?? null;
  }

  getStoreFamily(type: StoreType): string {
    if (type.startsWith('GBU')) return 'gbu';
    if (type === 'Hellfire') return 'hellfire';
    return 'other';
  }

  selectStation(station: Station): void {
    this.sms.selectedStationId.set(station.id);
  }
}
