import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TpoDashboard } from './tpo-dashboard/tpo-dashboard';
import { StudentDashboard } from './student-dashboard/student-dashboard';

@Component({
  selector: 'app-dashboard-loader',
  standalone: true,
  imports: [CommonModule, TpoDashboard, StudentDashboard],
  template: `
    <app-tpo-dashboard     *ngIf="role === 'TPO'"></app-tpo-dashboard>
    <app-student-dashboard *ngIf="role === 'STUDENT'"></app-student-dashboard>
  `
})
export class DashboardLoader {
  role: string | null = null;

  constructor() {
    const user = localStorage.getItem('user');
    this.role = user ? JSON.parse(user).role : null;
  }
}