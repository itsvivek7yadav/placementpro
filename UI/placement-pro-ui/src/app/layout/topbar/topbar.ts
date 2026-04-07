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
        <div class="brand-lockup">
          <div class="brand-name"><span>Pro</span>Launch</div>
          <div class="brand-role">{{ role === 'TPO' ? 'TPO Portal' : 'Student Portal' }}</div>
        </div>
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

        <button class="topbar-link-btn topbar-link-btn--green" type="button" (click)="openOffCampus()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M3 12h18"></path>
            <path d="M12 3c2.8 3 4.2 6 4.2 9s-1.4 6-4.2 9c-2.8-3-4.2-6-4.2-9s1.4-6 4.2-9z"></path>
          </svg>
          Off Campus Feed
        </button>

        <button class="user-chip" type="button" (click)="openProfile()">
          <div class="user-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="user-details">
            <div class="user-name">{{ userName }}</div>
          </div>
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
      background: linear-gradient(90deg, #0f172a 0%, #101a33 52%, #0f172a 100%);
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
      min-width: 0;
    }

    .brand-lockup {
      display: flex;
      align-items: baseline;
      gap: 14px;
      min-width: 0;
    }

    .brand-name {
      font-size: 29px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.6px;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .brand-name span {
      color: #3364eb;
    }

    .brand-role {
      font-size: 12px;
      font-weight: 600;
      color: #9fb2cc;
      letter-spacing: 0.08em;
      line-height: 1;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .topbar-link-btn {
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(59, 130, 246, 0.12);
      color: #e2e8f0;
      height: 38px;
      padding: 0 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .topbar-link-btn:hover {
      background: rgba(59, 130, 246, 0.18);
      border-color: rgba(96,165,250,0.26);
    }

    .topbar-link-btn--green {
      background: rgba(16, 185, 129, 0.14);
      border-color: rgba(52, 211, 153, 0.2);
      color: #d1fae5;
    }

    .topbar-link-btn--green:hover {
      background: rgba(16, 185, 129, 0.22);
      border-color: rgba(52, 211, 153, 0.34);
      color: #ecfdf5;
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
      border-radius: 12px;
      padding: 6px 12px 6px 8px;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
      transition: background 0.18s ease, border-color 0.18s ease;
    }

    .user-chip:hover {
      background: rgba(255,255,255,0.09);
      border-color: rgba(255,255,255,0.14);
    }

    .user-icon {
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: rgba(255,255,255,0.08);
      color: #cbd5e1;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 900px) {
      .topbar {
        height: 56px;
        padding: 0 14px;
        gap: 10px;
      }

      .brand-name {
        font-size: 21px;
      }

      .brand-role {
        font-size: 11px;
      }

      .topbar-right {
        margin-left: auto;
        gap: 8px;
      }

      .topbar-link-btn {
        display: none;
      }

      .brand-lockup {
        gap: 10px;
      }

      .user-chip {
        padding: 4px 8px 4px 4px;
      }

      .user-details {
        align-items: center;
      }
    }

    @media (max-width: 720px) {
      .brand-lockup {
        flex-direction: column;
        align-items: flex-start;
        gap: 3px;
      }

      .brand-name {
        font-size: 22px;
      }
    }
  `]
})
export class Topbar implements OnInit, OnDestroy {
  userName = '';
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

  openOffCampus(): void {
    this.notificationsOpen = false;
    this.router.navigateByUrl('/off-campus');
  }

  openProfile(): void {
    this.notificationsOpen = false;
    this.router.navigateByUrl(this.role === 'STUDENT' ? '/profile' : '/dashboard');
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.notificationsOpen = false;
  }
}
