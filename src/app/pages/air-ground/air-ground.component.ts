import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-air-ground-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './air-ground.component.html',
  styleUrls: ['./air-ground.component.scss'],
})
export class AirGroundPageComponent {}
