import { Component, computed, inject } from '@angular/core';
import { SmsService, Station } from '../../../services/sms.service';

@Component({
  selector: 'app-launch-status',
  standalone: true,
  imports: [],
  templateUrl: './launch-status.component.html',
  styleUrls: ['./launch-status.component.scss'],
})
export class LaunchStatusComponent {
  protected readonly sms = inject(SmsService);

  autoUpdate = true;
  manualUpdate = false;

  protected readonly stations = this.sms.stations;
  protected readonly selectedTargetName = this.sms.selectedTargetName;
  protected readonly selectedStationId = this.sms.selectedStationId;

  protected readonly selectedStation = computed<Station | undefined>(() =>
    this.stations().find(s => s.id === this.selectedStationId()),
  );

  protected readonly family = computed(() => {
    const st = this.selectedStation();
    return st ? this.sms.getStoreFamily(st.storeType) : 'GBU';
  });

  protected readonly armedStations = this.sms.armedStations;

  protected readonly isStorePowered = computed(() => this.selectedStation()?.storePower ?? false);
  protected readonly storeSettingsCorrect = computed(() => true);
  protected readonly targetSelected = computed(() => !!this.selectedTargetName());

  protected readonly fuzeArmed = computed(() => {
    const id = this.selectedStationId();
    if (!id) return false;
    return this.sms.getGbuSettings(id).fuzeArm === 'ARM';
  });

  protected readonly readyForLaunch = computed(() => this.isStorePowered() && this.targetSelected());

  getPrf(stationId: number): string {
    const station = this.stations().find(s => s.id === stationId);
    if (!station) return '--';
    const family = this.sms.getStoreFamily(station.storeType);
    if (family === 'Hellfire') return this.sms.getHellfireSettings(stationId).laserCode;
    if (family === 'GBU') return this.sms.getGbuSettings(stationId).prf;
    return '--';
  }
}
