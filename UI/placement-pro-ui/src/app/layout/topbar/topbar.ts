import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule],
  template: `
    <header class="topbar">

      <div class="topbar-left">
        <div class="logo">
          Placement<span>Pro</span>
        </div>
        <div class="topbar-divider"></div>
        <div class="user-role">{{ role }}</div>
      </div>

      <!-- 🔹 CENTER TITLE -->
      <div class="topbar-center">
        Symbiosis Institute of Computer Studies and Research
      </div>

      <div class="topbar-right">
        <div class="user-chip">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-details">
            <div class="user-name">{{ userName }}</div>
          </div>
        </div>

        <button class="logout-btn" (click)="logout()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>

    </header>
  `,
  styles: [`
    .topbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      height: 60px;
      background: #0f172a;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px 0 24px;
      box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.3);
    }

    /* ── Left ── */
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo {
      font-size: 17px;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.3px;
      white-space: nowrap;
    }

    .logo span {
      color: #3b82f6;
    }

    .topbar-divider {
      width: 1px;
      height: 18px;
      background: rgba(255,255,255,0.12);
    }

    /* 🔹 CENTER TEXT */
    .topbar-center {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      pointer-events: none;
      letter-spacing: 0.3px;
    }

    /* ── Right ── */
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 6px 12px 6px 6px;
    }

    .user-avatar {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: white;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .user-name {
      font-size: 13px;
      font-weight: 500;
      color: #e2e8f0;
      line-height: 1;
    }

    .user-role {
      font-size: 11px;
      color: #64748b;
      line-height: 1;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.25);
      color: #f87171;
      padding: 7px 13px;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.18s ease;
      white-space: nowrap;
      font-family: inherit;
    }

    .logout-btn:hover {
      background: rgba(239,68,68,0.22);
      border-color: rgba(239,68,68,0.45);
      color: #fca5a5;
    }
  `]
})
export class Topbar {
  userName = '';
  userInitial = '';
  role = '';

  constructor() {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.userName = parsed.name || '';
      this.role = parsed.role || '';
      this.userInitial = this.userName.charAt(0).toUpperCase();
    }
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }
}