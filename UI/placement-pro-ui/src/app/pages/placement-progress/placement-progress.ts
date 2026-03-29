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
  middle_name?: string;
  last_name?: string;
  prn?: string;
  program_name?: string;
  program_batch?: string;
  cgpa?: number;
  placement_status: 'PLACED' | 'NOT_PLACED';
  placed_company?: string | null;
  placement_mode?: 'ON_CAMPUS' | 'OFF_CAMPUS' | 'FAMILY_BUSINESS' | 'HIGHER_STUDIES' | 'NOT_PLACED' | null;
  placement_package?: number | null;
  placed_at?: string | null;
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
  current_round_name?: string | null;
  current_round_order?: number | null;
  current_round_status?: string | null;
  rounds?: Array<{
    round_id: number;
    round_name: string;
    round_order: number;
    status: string;
    remarks?: string | null;
  }>;
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
  private readonly apiUrl = buildApiUrl('student-progress');
  readonly placementModeOptions = [
    { value: 'ON_CAMPUS', label: 'On Campus' },
    { value: 'OFF_CAMPUS', label: 'Off Campus' },
    { value: 'FAMILY_BUSINESS', label: 'Family Business' },
    { value: 'HIGHER_STUDIES', label: 'Higher Studies' }
  ] as const;

  loading = true;
  savingPlacement = false;
  errorMessage = '';
  successMessage = '';
  isTpoView = false;
  selectedPlacementStatus: 'PLACED' | 'NOT_PLACED' = 'NOT_PLACED';
  selectedPlacementMode: 'ON_CAMPUS' | 'OFF_CAMPUS' | 'FAMILY_BUSINESS' | 'HIGHER_STUDIES' | 'NOT_PLACED' = 'NOT_PLACED';
  placedCompany = '';
  placementPackage: number | null = null;
  placedAt = '';
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
      ? `${this.apiUrl}/${studentId}`
      : `${this.apiUrl}/me`;

    this.http.get<PlacementProgressResponse>(url, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.progress = res;
        this.selectedPlacementStatus = res.student.placement_status || 'NOT_PLACED';
        this.selectedPlacementMode = res.student.placement_mode || 'NOT_PLACED';
        this.placedCompany = res.student.placed_company || '';
        this.placementPackage = res.student.placement_package ?? null;
        this.placedAt = res.student.placed_at ? String(res.student.placed_at).slice(0, 10) : '';
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

    this.http.patch<{
      placement_status: 'PLACED' | 'NOT_PLACED';
      placed_company?: string | null;
      placement_mode?: 'ON_CAMPUS' | 'OFF_CAMPUS' | 'FAMILY_BUSINESS' | 'HIGHER_STUDIES' | 'NOT_PLACED' | null;
      placement_package?: number | null;
      placed_at?: string | null;
      message: string;
    }>(
      `${this.apiUrl}/${this.progress.student.student_id}/placement-status`,
      {
        placement_status: this.selectedPlacementStatus,
        placed_company: this.selectedPlacementStatus === 'PLACED' ? this.placedCompany.trim() : null,
        placement_mode: this.selectedPlacementStatus === 'PLACED' ? this.selectedPlacementMode : 'NOT_PLACED',
        placement_package: this.selectedPlacementStatus === 'PLACED' ? this.placementPackage : null,
        placed_at: this.selectedPlacementStatus === 'PLACED' ? this.placedAt || null : null
      },
      { headers: this.authService.getAuthHeaders('application/json') }
    ).subscribe({
      next: (res) => {
        if (this.progress) {
          this.progress.student.placement_status = res.placement_status;
          this.progress.student.placed_company = res.placed_company ?? null;
          this.progress.student.placement_mode = res.placement_mode ?? null;
          this.progress.student.placement_package = res.placement_package ?? null;
          this.progress.student.placed_at = res.placed_at ?? null;
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

  onPlacementStatusChange(): void {
    if (this.selectedPlacementStatus === 'PLACED' && this.selectedPlacementMode === 'NOT_PLACED') {
      this.selectedPlacementMode = 'ON_CAMPUS';
    }

    if (this.selectedPlacementStatus === 'NOT_PLACED') {
      this.selectedPlacementMode = 'NOT_PLACED';
      this.placedCompany = '';
      this.placementPackage = null;
      this.placedAt = '';
    }
  }

  get isPlacedSelection(): boolean {
    return this.selectedPlacementStatus === 'PLACED';
  }

  get placementSummary(): string {
    if (!this.progress || this.progress.student.placement_status !== 'PLACED') {
      return 'Student is currently being tracked as placement seeking.';
    }

    const bits = [
      this.progress.student.placed_company,
      this.formatPlacementMode(this.progress.student.placement_mode),
      this.progress.student.placement_package != null ? `${this.progress.student.placement_package} LPA` : null,
      this.progress.student.placed_at ? `Placed on ${new Date(this.progress.student.placed_at).toLocaleDateString('en-IN')}` : null
    ].filter(Boolean);

    return bits.length ? bits.join(' • ') : 'Student is marked placed. Add outcome details for better reporting.';
  }

  formatPlacementMode(mode?: ProgressStudent['placement_mode']): string {
    if (!mode) {
      return '';
    }

    return mode
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  formatRoundStatus(status?: string | null): string {
    switch (status) {
      case 'CLEARED':
        return 'Cleared';
      case 'REJECTED':
        return 'Rejected';
      case 'PENDING':
        return 'In Progress';
      default:
        return 'Not Reached';
    }
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
