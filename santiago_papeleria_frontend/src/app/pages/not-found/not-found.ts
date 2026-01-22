import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, Search, FileQuestion } from 'lucide-angular';

@Component({
  selector: 'app-not-found',
  imports: [LucideAngularModule, RouterModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  readonly Home = Home;
  readonly Search = Search;
  readonly FileQuestion = FileQuestion;
}
