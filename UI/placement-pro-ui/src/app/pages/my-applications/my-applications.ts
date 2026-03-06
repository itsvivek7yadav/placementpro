import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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

  private API = 'http://localhost:5050/api';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadApplications();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadApplications() {
    this.loading = true;

    // ✅ Fix 1: was '/api/applications/my' — missing 'student/' prefix
    this.http.get<any>(
      `${this.API}/student/applications/my`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next:  (res) => { this.applications = res.applications; this.loading = false; },
      error: (err) => { console.error(err); this.loading = false; }
    });
  }

  isDeadlinePassed(deadline: string): boolean {
    return new Date(deadline) < new Date();
  }

  withdraw(applicationId: number) {
    if (!confirm('Withdraw this application?')) return;

    this.withdrawingId = applicationId;

    // ✅ Fix 2: was relative '/api/...' — must be full URL with auth header
    this.http.delete(
      `${this.API}/student/applications/withdraw/${applicationId}`,
      { headers: this.getAuthHeaders() }
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