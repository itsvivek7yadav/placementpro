import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationsService, NotificationItem } from '../../services/notifications.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class NotificationsPage implements OnInit {
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  loading = true;

  constructor(
    private notificationsService: NotificationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.notificationsService.startPolling();
    this.notificationsService.notifications$.subscribe((notifications) => {
      this.notifications = notifications;
    });
    this.notificationsService.unreadCount$.subscribe((count) => {
      this.unreadCount = count;
    });
    this.notificationsService.loading$.subscribe((loading) => {
      this.loading = loading;
    });
    this.notificationsService.refresh();
  }

  markAsRead(item: NotificationItem): void {
    if (!item.isRead) {
      this.notificationsService.markAsRead(item.id);
    }
    this.navigate(item);
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  private navigate(item: NotificationItem): void {
    if (!item.link) return;
    this.router.navigateByUrl(item.link);
  }
}
