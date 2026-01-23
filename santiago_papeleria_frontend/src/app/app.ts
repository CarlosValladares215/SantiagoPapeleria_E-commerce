import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast/toast.component';




@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  // ToastContainerComponent is used globally in app.html
}
