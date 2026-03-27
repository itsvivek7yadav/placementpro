import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth';
import { buildApiUrl } from '../../api.config';

interface ProgressStudent {
  student_id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  prn?: string;
  program_name?: string;
  program_batch?: string;
  cgpa?: number;
  placement_status: 'PLACED' | 'NOT_PLACED';
  college_email?: string;
  personal_email?: string;
  phone_number?: string;
}

interface ProgressOverview {
  totalApplications: number;
  totalCompaniesRegistered: number;
  selectedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalPublishedTests: number;
  appearedTests: number;
  submittedTests: number;
  averageTestPercentage: number;
  bestTestPercentage: number;
  attemptRate: number;
  applicationSuccessRate: number;
}

interface ProgressInsight {
  label: string;
  value: string;
  tone: 'positive' | 'warning' | 'neutral';
}

interface ProgressApplication {
  application_id: number;
  drive_id: number;
  company_name: string;
  job_role: string;
  job_type?: string;
  ctc?: number;
  drive_status: string;
  application_status: string;
  result: 'PENDING' | 'SELECTED' | 'REJECTED';
  applied_at: string;
  application_deadline?: string;
}

interface ProgressTest {
  test_id: number;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
  duration_mins: number;
  question_count: number;
  attempt_status?: string;
  my_score: number;
  my_total_marks: number;
  submitted_at?: string;
  percentage: number;
}

interface PlacementProgressResponse {
  student: ProgressStudent;
  overview: ProgressOverview;
  insights: ProgressInsight[];
  applications: ProgressApplication[];
  tests: ProgressTest[];
}

@Component({
  selector: 'app-placement-progress',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './placement-progress.html',
  styleUrls: ['./placement-progress.scss']
})
export class PlacementProgress implements OnInit {
  private API = buildApiUrl('/student-progress');

  loading = true;
  savingPlacement = false;
  errorMessage = '';
  successMessage = '';
  isTpoView = false;
  selectedPlacementStatus: 'PLACED' | 'NOT_PLACED' = 'NOT_PLACED';
  showApplications = false;
  showTests = false;

  progress: PlacementProgressResponse | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isTpoView = this.route.snapshot.paramMap.has('studentId');
    this.loadProgress();
  }

  loadProgress(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const studentId = this.route.snapshot.paramMap.get('studentId');
    const url = this.isTpoView && studentId
      ? `${this.API}/${studentId}`
      : `${this.API}/me`;

    this.http.get<PlacementProgressResponse>(url, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.progress = res;
        this.selectedPlacementStatus = res.student.placement_status || 'NOT_PLACED';
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load placement progress', err);
        this.errorMessage = err?.error?.message || 'Unable to load placement progress right now.';
        this.loading = false;
      }
    });
  }

  savePlacementStatus(): void {
    if (!this.isTpoView || !this.progress) {
      return;
    }

    this.savingPlacement = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.patch<{ placement_status: 'PLACED' | 'NOT_PLACED'; message: string }>(
      `${this.API}/${this.progress.student.student_id}/placement-status`,
      { placement_status: this.selectedPlacementStatus },
      { headers: this.authService.getAuthHeaders('application/json') }
    ).subscribe({
      next: (res) => {
        if (this.progress) {
          this.progress.student.placement_status = res.placement_status;
        }
        this.successMessage = res.message || 'Placement status updated successfully.';
        this.savingPlacement = false;
      },
      error: (err) => {
        console.error('Failed to update placement status', err);
        this.errorMessage = err?.error?.message || 'Could not update placement status.';
        this.savingPlacement = false;
      }
    });
  }

  goBackToStudents(): void {
    this.router.navigate(['/students']);
  }

  get headerTitle(): string {
    return this.isTpoView
      ? this.progress?.student?.name || 'Student Progress'
      : 'My Placement Progress';
  }

  get headerSubtitle(): string {
    if (!this.progress) {
      return '';
    }

    const student = this.progress.student;
    return [student.program_name, student.program_batch, student.prn].filter(Boolean).join(' • ');
  }

  get applicationList(): ProgressApplication[] {
    return this.progress?.applications || [];
  }

  get testList(): ProgressTest[] {
    return this.progress?.tests || [];
  }

  toggleApplications(): void {
    this.showApplications = !this.showApplications;
  }

  toggleTests(): void {
    this.showTests = !this.showTests;
  }

  get driveOutcomeChart(): { label: string; value: number; color: string }[] {
    if (!this.progress) {
      return [];
    }

    return [
      { label: 'Selected', value: this.progress.overview.selectedCount, color: '#16a34a' },
      { label: 'Pending', value: this.progress.overview.pendingCount, color: '#0891b2' },
      { label: 'Rejected', value: this.progress.overview.rejectedCount, color: '#dc2626' }
    ];
  }

  get driveOutcomeBackground(): string {
    const chart = this.driveOutcomeChart;
    const total = chart.reduce((sum, item) => sum + item.value, 0);

    if (!total) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    let current = 0;
    const segments = chart.map(item => {
      const start = current;
      current += (item.value / total) * 360;
      return `${item.color} ${start}deg ${current}deg`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }

  get topTestBars(): ProgressTest[] {
    return [...this.testList]
      .filter(test => !!test.attempt_status)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }

  get applicationEngagementWidth(): number {
    if (!this.progress) {
      return 0;
    }

    return Math.min(100, this.progress.overview.totalApplications * 10);
  }

  get submittedTestWidth(): number {
    return this.progress?.overview.attemptRate || 0;
  }

  get averageScoreWidth(): number {
    return this.progress?.overview.averageTestPercentage || 0;
  }
}
