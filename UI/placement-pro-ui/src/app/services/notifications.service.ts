import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, EMPTY, Subject, Subscription, timer } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { buildApiUrl } from '../api.config';
import { AuthService } from '../auth/auth';

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  relatedDriveId: number | null;
  relatedApplicationId: number | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

interface NotificationResponse {
  notifications: Array<{
    id: number;
    user_id: number;
    title: string;
    message: string;
    type: string;
    related_drive_id: number | null;
    related_application_id: number | null;
    link: string | null;
    is_read: number | boolean;
    created_at: string;
    read_at: string | null;
  }>;
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiUrl = buildApiUrl('notifications');
  private readonly destroy$ = new Subject<void>();
  private readonly notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  private pollSubscription: Subscription | null = null;
  private isPrimed = false;
  private shownToastIds = new Set<number>();

  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly unreadCount$ = this.unreadCountSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  startPolling(intervalMs = 30000): void {
    if (this.pollSubscription || !this.authService.getToken()) {
      return;
    }

    this.pollSubscription = timer(0, intervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.fetchNotifications())
      )
      .subscribe();
  }

  stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
    this.isPrimed = false;
  }

  fetchNotifications(page = 1, limit = 12) {
    this.loadingSubject.next(true);
    return this.http.get<NotificationResponse>(this.apiUrl, {
      params: { page, limit },
      headers: this.authService.getAuthHeaders()
    }).pipe(
      takeUntil(this.destroy$),
      tap((response) => {
        const notifications = response.notifications.map((item) => this.normalize(item));
        this.notificationsSubject.next(notifications);
        this.unreadCountSubject.next(response.unreadCount || 0);
        this.emitToasts(notifications);
      }),
      catchError((error) => {
        this.loadingSubject.next(false);
        return EMPTY;
      }),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  refresh(): void {
    this.fetchNotifications().subscribe();
  }

  markAsRead(id: number): void {
    this.http.patch(`${this.apiUrl}/${id}/read`, {}, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: () => {
        const nextNotifications = this.notificationsSubject.value.map((item) =>
          item.id === id ? { ...item, isRead: true } : item
        );
        this.notificationsSubject.next(nextNotifications);
        this.unreadCountSubject.next(nextNotifications.filter((item) => !item.isRead).length);
      }
    });
  }

  markAllAsRead(): void {
    this.http.patch(`${this.apiUrl}/read-all`, {}, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: () => {
        const nextNotifications = this.notificationsSubject.value.map((item) => ({ ...item, isRead: true }));
        this.notificationsSubject.next(nextNotifications);
        this.unreadCountSubject.next(0);
      }
    });
  }

  sendDriveAnnouncement(payload: {
    driveId: number;
    audience: 'APPLICANTS' | 'ELIGIBLE';
    title: string;
    message: string;
    link?: string | null;
  }) {
    return this.http.post(this.apiUrl, payload, {
      headers: this.authService.getAuthHeaders('application/json')
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private normalize(item: NotificationResponse['notifications'][number]): NotificationItem {
    return {
      id: item.id,
      userId: item.user_id,
      title: item.title,
      message: item.message,
      type: item.type,
      relatedDriveId: item.related_drive_id,
      relatedApplicationId: item.related_application_id,
      link: item.link,
      isRead: Boolean(item.is_read),
      createdAt: item.created_at,
      readAt: item.read_at
    };
  }

  private emitToasts(notifications: NotificationItem[]): void {
    if (!this.isPrimed) {
      notifications.forEach((item) => this.shownToastIds.add(item.id));
      this.isPrimed = true;
      return;
    }

    const newUnread = notifications.filter((item) => !item.isRead && !this.shownToastIds.has(item.id));
    newUnread.slice(0, 2).forEach((item) => {
      this.shownToastIds.add(item.id);
      this.snackBar.open(item.title, 'Dismiss', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    });
  }
}
