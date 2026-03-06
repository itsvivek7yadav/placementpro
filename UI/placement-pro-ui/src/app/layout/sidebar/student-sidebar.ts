import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-student-sidebar',
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="sidebar">

      <div class="sidebar-header">
        <div class="user-avatar">{{ userInitial }}</div>
        <div class="user-info">
          <div class="user-name">{{ userName }}</div>
          <div class="user-role">{{ program || 'Student' }}</div>
        </div>
      </div>

      <div class="nav-label">Navigation</div>

      <ul class="menu">

        <li class="menu-item"
            routerLink="/dashboard"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{exact:true}">
          <div class="menu-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <span>Dashboard</span>
        </li>

        <li class="menu-item"
            routerLink="/drives"
            routerLinkActive="active">
          <div class="menu-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <span style="flex:1">Eligible Drives</span>
          <div class="badge" *ngIf="eligibleCount > 0">{{ eligibleCount }}</div>
        </li>

        <li class="menu-item"
            routerLink="/applications"
            routerLinkActive="active">
          <div class="menu-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <span>My Applications</span>
        </li>

        <li class="menu-item" routerLink="/profile" routerLinkActive="active">
  <div class="menu-icon"><!-- person icon --></div>
  <span>My Profile</span>
</li>

      </ul>

      <!-- Placement status pill at bottom of nav -->
      <div class="placement-status" [ngClass]="placementStatus === 'PLACED' ? 'ps-placed' : 'ps-seeking'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="8" r="7"/>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
        </svg>
        {{ placementStatus === 'PLACED' ? 'Placed' : 'Seeking Placement' }}
      </div>

      <div class="sidebar-footer">
        <button class="logout-btn" (click)="logout()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>

    </nav>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

    :host { display: block; height: calc(100vh - 60px); }

    .sidebar {
      width: 240px;
      height: 100%;
      background: #0f172a;
      border-right: 1px solid rgba(255,255,255,0.07);
      display: flex;
      flex-direction: column;
      font-family: 'Inter', sans-serif;
      position: sticky;
      top: 60px;
      overflow-y: auto;
      overflow-x: hidden;
      flex-shrink: 0;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 8px;
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .user-info { display: flex; flex-direction: column; gap: 2px; }

    .user-name {
      font-size: 13.5px;
      font-weight: 600;
      color: #f1f5f9;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }

    .user-role { font-size: 11px; color: #475569; line-height: 1; }

    .nav-label {
      font-size: 10.5px;
      font-weight: 600;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.9px;
      padding: 10px 18px 6px;
    }

    .menu { list-style: none; padding: 0 8px; margin: 0; flex: 1; }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13.5px;
      color: #94a3b8;
      transition: all 0.15s;
      margin-bottom: 1px;
      position: relative;
      text-decoration: none;
      list-style: none;
    }

    .menu-item span { flex: 1; }

    .menu-item:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }

    .menu-item:hover .menu-icon,
    .menu-item.active .menu-icon { color: #10b981; } /* green accent for student */

    .menu-item.active {
      background: rgba(16,185,129,0.12);
      color: #6ee7b7;
      font-weight: 500;
    }

    .menu-item.active::before {
      content: '';
      position: absolute;
      left: 0; top: 50%;
      transform: translateY(-50%);
      width: 3px; height: 60%;
      background: #10b981;
      border-radius: 0 3px 3px 0;
    }

    .menu-icon {
      width: 18px; height: 18px;
      display: flex; align-items: center; justify-content: center;
      color: #475569;
      flex-shrink: 0;
      transition: color 0.15s;
    }

    .badge {
      background: #10b981;
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      line-height: 1.4;
    }

    .placement-status {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      font-weight: 500;
      margin: 8px 8px 0;
      padding: 8px 12px;
      border-radius: 8px;

      &.ps-placed {
        background: rgba(16,185,129,0.1);
        color: #10b981;
        border: 1px solid rgba(16,185,129,0.2);
      }

      &.ps-seeking {
        background: rgba(245,158,11,0.08);
        color: #d97706;
        border: 1px solid rgba(245,158,11,0.15);
      }
    }

    .sidebar-footer {
      padding: 12px 8px 16px;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin-top: auto;
    }

    .logout-btn {
      width: 100%;
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #64748b;
      font-family: 'Inter', sans-serif;
      font-size: 13.5px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
    }

    .logout-btn:hover { background: rgba(239,68,68,0.1); color: #f87171; }
  `]
})
export class StudentSidebar {

  userName = '';
  userInitial = '';
  program = '';
  placementStatus = 'SEEKING';
  eligibleCount = 0; // wire to API when ready

  constructor(private router: Router) {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.userName = parsed.name || '';
      this.userInitial = this.userName.charAt(0).toUpperCase();
      this.program = parsed.program_name || '';
      this.placementStatus = parsed.placement_status || 'SEEKING';
    }
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}