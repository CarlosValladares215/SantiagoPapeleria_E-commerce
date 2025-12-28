import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SyncStats {
  updated: number;
  newProduct: number;
  errors: number;
}

export interface SyncErrorItem {
  code: string;
  name: string;
  error: string;
  action: string;
}

export interface SyncLogEntry {
  time: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export interface SyncErrorDetail {
  title: string;
  message: string;
  url: string;
  code: string;
}

export interface SyncEmailData {
  syncType: string;
  date: string;
  duration?: string; // Optional for error state
  status: string;
  attempts?: string; // For error state
  stats?: SyncStats;
  errorList?: SyncErrorItem[];
  logs?: SyncLogEntry[];
  errorDetails?: SyncErrorDetail[]; // List of error causes or specific error object
  nextScheduled?: string;
  alertMessage?: string; // Custom message for the alert box
}

@Component({
  selector: 'app-sync-email-preview',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  templateUrl: './sync-email-preview.component.html',
  styleUrls: ['./sync-email-preview.component.scss']
})
export class SyncEmailPreviewComponent {
  @Input() type: 'success' | 'warning' | 'error' = 'success';
  @Input() data: SyncEmailData | undefined;
}
