import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { LoadoutDisplayComponent } from './components/shared/loadout-display/loadout-display.component';
import { AirGroundPageComponent } from './pages/air-ground/air-ground.component';
import { ProfilesPageComponent } from './pages/profiles/profiles.component';
import { StatusPageComponent } from './pages/status/status.component';
import { SelectiveJettisonPageComponent } from './pages/selective-jettison/selective-jettison.component';
import { InventoryPageComponent } from './pages/inventory/inventory.component';

const routes: Routes = [
  { path: '',                   redirectTo: 'inventory', pathMatch: 'full' },
  { path: 'air-ground',         component: AirGroundPageComponent },
  { path: 'profiles',           component: ProfilesPageComponent },
  { path: 'status',             component: StatusPageComponent },
  { path: 'selective-jettison', component: SelectiveJettisonPageComponent },
  { path: 'inventory',          component: InventoryPageComponent },
];

@NgModule({
  declarations: [
    AppComponent,
    LoadoutDisplayComponent,
    AirGroundPageComponent,
    ProfilesPageComponent,
    StatusPageComponent,
    SelectiveJettisonPageComponent,
    InventoryPageComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    RouterModule.forRoot(routes),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
