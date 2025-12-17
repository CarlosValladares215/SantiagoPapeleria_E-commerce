import { Component } from '@angular/core';
import { AdminLayoutComponent } from '../../shared/admin-layout/admin-layout.component';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin',
  imports: [AdminLayoutComponent, RouterOutlet],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {

}
