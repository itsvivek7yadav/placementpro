import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { buildApiUrl } from '../../api.config';
import { AuthService } from '../../auth/auth';

@Component({
  selector: 'app-my-applications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-applications.html',
  styleUrls: ['./my-applications.scss']
})
export class MyApplications implements OnInit {

  applications: any[] = [];
  loading = true;
  withdrawingId: number | null = null;

  private readonly apiBase = buildApiUrl();

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.loadApplications();
  }

  loadApplications() {
    this.loading = true;

    this.http.get<any>(
      `${this.apiBase}/applications/my`,
      { headers: this.authService.getAuthHeaders() }
    ).subscribe({
      next:  (res) => { this.applications = res.applications; this.loading = false; },
      error: (err) => { console.error(err); this.loading = false; }
    });
  }

  isDeadlinePassed(deadline: string): boolean {
    return new Date(deadline) < new Date();
  }

  hasRounds(app: any): boolean {
    return Array.isArray(app?.rounds) && app.rounds.length > 0;
  }

  formatRoundStatus(status?: string | null): string {
    switch (status) {
      case 'CLEARED':
        return 'Cleared';
      case 'REJECTED':
        return 'Rejected';
      case 'ABSENT':
        return 'Absent';
      case 'PENDING':
        return 'In Progress';
      default:
        return 'Not Reached';
    }
  }

  getCurrentRoundSummary(app: any): string {
    if (!this.hasRounds(app)) {
      return 'Round updates will appear here once the hiring process starts.';
    }

    if (!app.current_round_name) {
      return app.result === 'SELECTED'
        ? 'All hiring rounds cleared.'
        : 'Round update pending from placement cell.';
    }

    const orderLabel = app.current_round_order ? `Round ${app.current_round_order}` : 'Current Round';
    return `${orderLabel}: ${app.current_round_name} • ${this.formatRoundStatus(app.current_round_status)}`;
  }

  withdraw(applicationId: number) {
    if (!confirm('Withdraw this application?')) return;

    this.withdrawingId = applicationId;

    this.http.delete(
      `${this.apiBase}/applications/withdraw/${applicationId}`,
      { headers: this.authService.getAuthHeaders() }
    ).subscribe({
      next: () => {
        this.loadApplications();
        this.withdrawingId = null;
      },
      error: err => {
        alert(err.error?.message || 'Withdraw failed');
        this.withdrawingId = null;
      }
    });
  }
}
