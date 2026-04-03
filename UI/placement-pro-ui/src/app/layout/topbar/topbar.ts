import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LayoutStateService } from '../layout-state.service';
import { NotificationItem, NotificationsService } from '../../services/notifications.service';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule, DatePipe],
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

      <div class="topbar-center" *ngIf="!isMobile">
        (Institute)Campus Placement Management System
      </div>

      <div class="topbar-right">
        <div class="notification-shell">
          <button class="icon-btn" type="button" (click)="toggleNotifications($event)" aria-label="Open notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"/>
              <path d="M9 17a3 3 0 0 0 6 0"/>
            </svg>
            <span class="notification-badge" *ngIf="unreadCount > 0">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
          </button>

          <div class="notification-dropdown" *ngIf="notificationsOpen" (click)="$event.stopPropagation()">
            <div class="dropdown-head">
              <div>
                <strong>Notifications</strong>
                <span>{{ unreadCount }} unread</span>
              </div>
              <button type="button" class="text-btn" (click)="markAllAsRead()" [disabled]="unreadCount === 0">Mark all read</button>
            </div>

            <div class="dropdown-list" *ngIf="notifications.length > 0; else emptyNotifications">
              <button
                type="button"
                class="notification-item"
                *ngFor="let item of notifications"
                [class.unread]="!item.isRead"
                (click)="openNotification(item)">
                <div class="notification-copy">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.message }}</span>
                </div>
                <small>{{ item.createdAt | date:'short' }}</small>
              </button>
            </div>

            <ng-template #emptyNotifications>
              <div class="dropdown-empty">No notifications yet.</div>
            </ng-template>

            <button type="button" class="view-all-btn" (click)="openAllNotifications()">View all notifications</button>
          </div>
        </div>

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

    .menu-btn,
    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.05);
      color: #e2e8f0;
      cursor: pointer;
      flex-shrink: 0;
    }

    .menu-btn {
      margin-right: 10px;
    }

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

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .notification-shell {
      position: relative;
    }

    .notification-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: #ef4444;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 2px #0f172a;
    }

    .notification-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: min(360px, calc(100vw - 24px));
      background: #fff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.18);
      overflow: hidden;
      z-index: 1200;
    }

    .dropdown-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .dropdown-head strong {
      display: block;
      font-size: 0.95rem;
    }

    .dropdown-head span {
      font-size: 0.8rem;
      color: #64748b;
    }

    .text-btn,
    .view-all-btn {
      border: none;
      background: transparent;
      color: #2563eb;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }

    .dropdown-list {
      max-height: 360px;
      overflow-y: auto;
    }

    .notification-item {
      width: 100%;
      border: none;
      background: #fff;
      text-align: left;
      display: grid;
      gap: 0.35rem;
      padding: 0.9rem 1rem;
      border-bottom: 1px solid #eef2f7;
      cursor: pointer;
      font-family: inherit;
    }

    .notification-item.unread {
      background: #f8fbff;
    }

    .notification-copy {
      display: grid;
      gap: 0.25rem;
    }

    .notification-copy strong {
      font-size: 0.9rem;
      color: #0f172a;
    }

    .notification-copy span,
    .notification-item small,
    .dropdown-empty {
      color: #64748b;
    }

    .notification-copy span {
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .notification-item small {
      font-size: 0.75rem;
    }

    .dropdown-empty {
      padding: 1rem;
      text-align: center;
      font-size: 0.86rem;
    }

    .view-all-btn {
      width: 100%;
      text-align: center;
      padding: 0.9rem 1rem;
      border-top: 1px solid #e2e8f0;
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
  notificationsOpen = false;
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private layoutState: LayoutStateService,
    private notificationsService: NotificationsService,
    private router: Router
  ) {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      this.userName = parsed.name || '';
      this.role = parsed.role || '';
      this.userInitial = this.userName.charAt(0).toUpperCase();
    }
  }

  ngOnInit(): void {
    this.notificationsService.startPolling();

    this.notificationsService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications) => {
        this.notifications = notifications.slice(0, 6);
      });

    this.notificationsService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.unreadCount = count;
      });

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

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;
  }

  openNotification(item: NotificationItem): void {
    if (!item.isRead) {
      this.notificationsService.markAsRead(item.id);
    }
    this.notificationsOpen = false;
    if (item.link) {
      this.router.navigateByUrl(item.link);
    }
  }

  openAllNotifications(): void {
    this.notificationsOpen = false;
    this.router.navigateByUrl('/notifications');
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.notificationsOpen = false;
  }

  logout(): void {
    this.notificationsService.stopPolling();
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigateByUrl('/login');
  }
}
