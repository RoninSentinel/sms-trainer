import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { SmsService, StoreStatus } from '../../services/sms.service';

@Component({
  selector: 'app-status-page',
  standalone: true,
  imports: [NgClass],
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss'],
})
export class StatusPageComponent {
  protected readonly sms = inject(SmsService);

  protected readonly stations = this.sms.stations;
  protected readonly warnings = this.sms.warnings;
  protected readonly warningCount = this.sms.warningCount;

  activeView = 'summary';

  getStatusClass(s: StoreStatus): string {
    return this.sms.getStatusClass(s);
  }
}
