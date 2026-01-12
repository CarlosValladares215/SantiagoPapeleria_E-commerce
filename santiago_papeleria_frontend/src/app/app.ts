import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';



@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatbotComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App { }
