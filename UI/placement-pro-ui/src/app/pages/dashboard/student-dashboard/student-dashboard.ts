import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../auth/auth';
import { NotificationsService } from '../../../services/notifications.service';
import { buildApiUrl } from '../../../api.config';

interface StudentStats {
  eligibleDrives: number;
  applied: number;
  resultsAwaited: number;
  selected: number;
}

interface Notification {
  id: number;
  text: string;
  time: string;
  type: 'result' | 'drive' | 'general' | 'announcement';
  result?: 'SELECTED' | 'REJECTED' | 'ABSENT';
  read: boolean;
  link?: string | null;
}

interface Application {
  company: string;
  role: string;
  result: 'PENDING' | 'SELECTED' | 'REJECTED' | 'ABSENT';
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.html',
  styleUrls: ['./student-dashboard.scss']
})
export class StudentDashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly apiBase = buildApiUrl();

studentName = '';
studentProgram = '';
greeting = '';
today = '';
placementStatus = 'SEEKING';

  stats: StudentStats = {
    eligibleDrives: 0,
    applied: 0,
    resultsAwaited: 0,
    selected: 0
  };

  notifications: Notification[] = [];
  applications: Application[] = [];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  isAbsentResult(result?: string | null): boolean {
    return result === 'ABSENT';
  }

  isRejectedLikeResult(result?: string | null): boolean {
    return result === 'REJECTED' || result === 'ABSENT';
  }

  getApplicationStatusLabel(result: Application['result']): string {
    if (result === 'PENDING') return 'Awaiting';
    if (result === 'SELECTED') return 'Selected';
    if (result === 'ABSENT') return 'Absent';
    return 'Rejected';
  }

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit() {
    this.setGreeting();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setGreeting() {
    const hour = new Date().getHours();
    if (hour < 12)      this.greeting = 'morning';
    else if (hour < 17) this.greeting = 'afternoon';
    else                this.greeting = 'evening';

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.studentName = user.name?.split(' ')[0] || 'Student';
     this.studentProgram = user.program || '';

    this.today = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  loadData() {
    this.placementStatus = 'SEEKING';

    this.stats = {
      eligibleDrives: 8,
      applied: 5,
      resultsAwaited: 3,
      selected: 1
    };

    this.notificationsService.startPolling();
    this.notificationsService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.notifications = items.slice(0, 4).map((item) => {
          const normalizedMessage = item.message.toLowerCase();
          return {
            id: item.id,
            text: item.title,
            time: new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            type: item.type === 'result' ? 'result' : item.type === 'new_drive' || item.type === 'drive_update' || item.type === 'drive_reopened' ? 'drive' : 'announcement',
            result: normalizedMessage.includes('selected')
              ? 'SELECTED'
              : normalizedMessage.includes('rejected')
                ? 'REJECTED'
                : normalizedMessage.includes('absent')
                  ? 'ABSENT'
                  : undefined,
            read: item.isRead,
            link: item.link
          };
        });
      });
    this.notificationsService.refresh();

    this.http.get<any>(`${this.apiBase}/applications/my`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        const applications = Array.isArray(response?.applications) ? response.applications : [];
        this.applications = applications.slice(0, 5).map((app: any) => ({
          company: app.company_name,
          role: app.job_role,
          result: app.result
        }));

        this.stats = {
          eligibleDrives: this.stats.eligibleDrives,
          applied: applications.length,
          resultsAwaited: applications.filter((app: any) => app.result === 'PENDING').length,
          selected: applications.filter((app: any) => app.result === 'SELECTED').length
        };
      },
      error: () => {
        this.applications = [];
      }
    });
  }
}
