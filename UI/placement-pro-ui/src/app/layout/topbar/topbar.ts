import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LayoutStateService } from '../layout-state.service';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <button *ngIf="isMobile" class="menu-btn" (click)="toggleSidebar()" aria-label="Toggle navigation menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div class="topbar-left">
        <div class="logo">
          <span>Pro</span>Launch
        </div>
        <div class="topbar-divider" *ngIf="!isMobile"></div>
        <div class="user-role">{{ role }}</div>
      </div>

      <!-- 🔹 CENTER TITLE -->
      <div class="topbar-center" *ngIf="!isMobile">
(Institute)Campus Placement Management System
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

    .menu-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      margin-right: 10px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.05);
      color: #e2e8f0;
      cursor: pointer;
      flex-shrink: 0;
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

    @media (max-width: 900px) {
      .topbar {
        height: 56px;
        padding: 0 14px;
        gap: 10px;
      }

      .topbar-left {
        gap: 10px;
        min-width: 0;
      }

      .logo {
        font-size: 15px;
      }

      .user-role {
        display: none;
      }

      .topbar-right {
        margin-left: auto;
        gap: 8px;
      }

      .user-chip {
        padding: 4px 8px 4px 4px;
      }

      .user-details {
        display: none;
      }

      .logout-btn {
        padding: 7px 10px;
        font-size: 12px;
      }
    }
  `]
})
export class Topbar implements OnInit, OnDestroy {
  userName = '';
  userInitial = '';
  role = '';
  isMobile = false;
  private destroy$ = new Subject<void>();

  constructor(private layoutState: LayoutStateService) {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.userName = parsed.name || '';
      this.role = parsed.role || '';
      this.userInitial = this.userName.charAt(0).toUpperCase();
    }
  }

  ngOnInit(): void {
    this.layoutState.isMobile$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isMobile) => {
        this.isMobile = isMobile;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.layoutState.toggleSidebar();
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }
}
