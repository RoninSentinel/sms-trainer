import { Routes } from '@angular/router';
import { AirGroundPageComponent } from './pages/air-ground/air-ground.component';
import { SelectStoreComponent } from './pages/air-ground/select-store/select-store.component';
import { StoreSettingsComponent } from './pages/air-ground/store-settings/store-settings.component';
import { SelectTargetComponent } from './pages/air-ground/select-target/select-target.component';
import { ReleaseSettingsComponent } from './pages/air-ground/release-settings/release-settings.component';
import { LaunchStatusComponent } from './pages/air-ground/launch-status/launch-status.component';
import { ProfilesPageComponent } from './pages/profiles/profiles.component';
import { StatusPageComponent } from './pages/status/status.component';
import { SelectiveJettisonPageComponent } from './pages/selective-jettison/selective-jettison.component';
import { InventoryPageComponent } from './pages/inventory/inventory.component';

export const routes: Routes = [
  { path: '', redirectTo: 'inventory', pathMatch: 'full' },
  {
    path: 'air-ground',
    component: AirGroundPageComponent,
    children: [
      { path: '', redirectTo: 'select-store', pathMatch: 'full' },
      { path: 'select-store', component: SelectStoreComponent },
      { path: 'store-settings', component: StoreSettingsComponent },
      { path: 'select-target', component: SelectTargetComponent },
      { path: 'release-settings', component: ReleaseSettingsComponent },
      { path: 'launch-status', component: LaunchStatusComponent },
    ],
  },
  { path: 'profiles', component: ProfilesPageComponent },
  { path: 'status', component: StatusPageComponent },
  { path: 'selective-jettison', component: SelectiveJettisonPageComponent },
  { path: 'inventory', component: InventoryPageComponent },
];
