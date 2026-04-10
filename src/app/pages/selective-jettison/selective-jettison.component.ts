import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { SmsService, StoreStatus, StoreType } from '../../services/sms.service';

@Component({
  selector: 'app-selective-jettison-page',
  standalone: true,
  imports: [NgClass],
  templateUrl: './selective-jettison.component.html',
  styleUrls: ['./selective-jettison.component.scss'],
})
export class SelectiveJettisonPageComponent {
  protected readonly sms = inject(SmsService);
  protected readonly stations = this.sms.stations;

  readonly selectedIdSet = signal<number[]>([]);
  readonly jettisoned = signal<number[]>([]);
  readonly jettExecuted = signal(false);

  protected readonly selectedCount = computed(() => this.selectedIdSet().length);

  isSelected(id: number): boolean {
    return this.selectedIdSet().includes(id);
  }
  isJettisoned(id: number): boolean {
    return this.jettisoned().includes(id);
  }

  toggleSelect(id: number): void {
    this.selectedIdSet.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  executeJettison(): void {
    const ids = this.selectedIdSet();
    this.sms.stations.update((list) =>
      list.map((s) =>
        ids.includes(s.id) ? { ...s, storeStatus: 'JETTED' as StoreStatus, storeType: '' as StoreType } : s,
      ),
    );
    this.jettisoned.set(ids);
    this.selectedIdSet.set([]);
    this.jettExecuted.set(true);
  }

  cancelJettison(): void {
    this.selectedIdSet.set([]);
    this.jettExecuted.set(false);
  }

  getStatusClass(s: StoreStatus): string {
    return this.sms.getStatusClass(s);
  }
}
