import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-drive-applicants',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule, FormsModule],
  templateUrl: './drive-applicants.html',
  styleUrls: ['./drive-applicants.scss']
})
export class DriveApplicants implements OnInit {

  driveId!: number;
  applications: any[] = [];
  filtered: any[] = [];
  loading = true;

  searchQuery  = '';
  filterResult: 'ALL' | 'PENDING' | 'SELECTED' | 'REJECTED' = 'ALL';

  updatingId:  number | null = null;
  bulkUpdating = false;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  private API = 'http://localhost:5050/api/tpo/applications';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.driveId = Number(this.route.snapshot.paramMap.get('drive_id'));
    this.loadApplicants();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadApplicants() {
    this.loading = true;
    this.http.get<{ applications: any[] }>(
      `${this.API}/drive/${this.driveId}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: res => {
        this.applications = res.applications || [];
        this.applyFilters();
        this.loading = false;
      },
      error: err => {
        console.error('Failed to load applicants', err);
        this.loading = false;
      }
    });
  }

  applyFilters() {
    let list = [...this.applications];

    if (this.filterResult !== 'ALL') {
      list = list.filter(a => a.result === this.filterResult);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(a =>
        a.student_name?.toLowerCase().includes(q) ||
        a.prn?.toLowerCase().includes(q) ||
        a.program_name?.toLowerCase().includes(q) ||
        a.student_email?.toLowerCase().includes(q)
      );
    }

    this.filtered = list;
  }

  setFilter(f: 'ALL' | 'PENDING' | 'SELECTED' | 'REJECTED') {
    this.filterResult = f;
    this.applyFilters();
  }

  onSearch() { this.applyFilters(); }

  // ── Single result — works for both pending and already-decided ──
  updateResult(applicationId: number, result: 'SELECTED' | 'REJECTED') {
    const app = this.applications.find(a => a.application_id === applicationId);
    if (!app || app.result === result) return;

    if (app.result !== 'PENDING') {
      if (!confirm(`Change result from ${app.result} → ${result}?`)) return;
    }

    this.updatingId = applicationId;

    this.http.patch(
      `${this.API}/${applicationId}/result`,
      { result },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        app.result = result;
        this.applyFilters();
        this.updatingId = null;
        this.showToast(`Marked as ${result}`, 'success');
      },
      error: err => {
        this.updatingId = null;
        this.showToast(err.error?.message || 'Failed to update', 'error');
      }
    });
  }

  // ── Bulk update all PENDING ──────────────────────────────
  bulkUpdate(result: 'SELECTED' | 'REJECTED') {
  // Only act on PENDING within the current filtered view
  const targets = this.filtered.filter(a => a.result === 'PENDING');

  if (targets.length === 0) {
    this.showToast('No pending applicants in current view', 'error');
    return;
  }

  const label = result === 'SELECTED' ? 'Select' : 'Reject';
  if (!confirm(`${label} all ${targets.length} pending applicant(s) in current view?`)) return;

  this.bulkUpdating = true;

  this.http.patch(
    `${this.API}/bulk-result`,
    { drive_id: this.driveId, result },
    { headers: this.getHeaders() }
  ).subscribe({
    next: () => {
      // Update locally — only change PENDING ones in filtered view
      targets.forEach(a => {
        const original = this.applications.find(x => x.application_id === a.application_id);
        if (original) original.result = result;
      });
      this.applyFilters();
      this.bulkUpdating = false;
      this.showToast(`${targets.length} applicant(s) marked as ${result}`, 'success');
    },
    error: err => {
      this.bulkUpdating = false;
      this.showToast(err.error?.message || 'Bulk update failed', 'error');
    }
  });
}

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType    = type;
    setTimeout(() => this.toastMessage = '', 3500);
  }

  exportToExcel() {
  const headers = [
    'Name', 'College Email', 'Personal Email', 'Phone', 'Gender',
    'PRN', 'Program', 'Batch', 'CGPA',
    'UG Degree', 'UG Specialization', 'UG %',
    'PG Degree', 'PG Specialization', 'PG %',
    'Active Backlog', 'Native State',
    'Result', 'Applied At'
  ];
  const rows = this.applications.map(a => [
    a.student_name, a.student_email, a.personal_email,
    a.phone_number, a.gender,
    a.prn, a.program_name, a.program_batch, a.cgpa,
    a.ug_course_name, a.ug_specialization, a.ug_percentage,
    a.pg_degree, a.pg_specialization, a.pg_percentage,
    a.backlog ? 'Yes' : 'No', a.native_state,
    a.result, new Date(a.applied_at).toLocaleString()
  ]);

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${v ?? ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `drive-${this.driveId}-applicants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  goBack() { this.router.navigate(['/placement-drives/open-drives']); }

  get totalCount()    { return this.applications.length; }
  get pendingCount()  { return this.applications.filter(a => a.result === 'PENDING').length; }
  get selectedCount() { return this.applications.filter(a => a.result === 'SELECTED').length; }
  get rejectedCount() { return this.applications.filter(a => a.result === 'REJECTED').length; }
}