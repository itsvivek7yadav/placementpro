import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-tpo-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tpo-sidebar.html',
  styleUrls: ['./tpo-sidebar.scss']
})
export class TpoSidebar {

  drivesExpanded = false;

  constructor(private router: Router) {
    // Auto-expand drives submenu if currently on a drives route
    this.drivesExpanded = this.router.url.includes('/placement-drives');
  }

  toggleDrives() {
    this.drivesExpanded = !this.drivesExpanded;
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}