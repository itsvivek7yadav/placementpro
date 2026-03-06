import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TpoDashboard } from './tpo-dashboard/tpo-dashboard';
import { StudentDashboard } from './student-dashboard/student-dashboard';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TpoDashboard, StudentDashboard],
  templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {

  role = '';

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.role = (user.role || '').toUpperCase();
  }
}