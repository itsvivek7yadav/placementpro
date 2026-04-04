import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Applicant, DriveRound, RoundStatus } from '../../../models/drive-applicants.models';
import { ManageRoundsDialogComponent } from './manage-rounds-dialog';
import { PlacementService } from '../../../services/placement.service';
import { AuthService } from '../../../auth/auth';
import { NotificationsService } from '../../../services/notifications.service';
import { buildBackendUrl } from '../../../api.config';

@Component({
  selector: 'app-drive-applicants',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './drive-applicants.html',
  styleUrls: ['./drive-applicants.scss']
})
export class DriveApplicants implements OnInit {
  driveId!: number;
  rounds: DriveRound[] = [];
  applicants: Applicant[] = [];
  filteredApplicants: Applicant[] = [];
  displayedColumns: string[] = ['select', 'student', 'result'];
  loading = true;
  searchQuery = '';
  filterRoundId: number | null = null;
  filterStatus: 'PENDING' | 'CLEARED' | 'REJECTED' | 'ABSENT' | null = null;
  updatingId: number | null = null;
  bulkUpdating = false;
  exportZipLoading = false;
  sendingAnnouncement = false;
  announcementAudience: 'APPLICANTS' | 'ELIGIBLE' = 'APPLICANTS';
  announcementTitle = '';
  announcementMessage = '';
  announcementLink = '';
  readonly driveApi = '/api/drives';
  readonly applicationApi = '/api/applications';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private placementService: PlacementService,
    private authService: AuthService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.driveId = Number(this.route.snapshot.paramMap.get('drive_id'));
    this.loadApplicants();
  }

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  private normalizeApplicantsResponse(res: unknown): { rounds: DriveRound[]; applications: Applicant[] } {
    if (typeof res === 'string') {
      try {
        const parsed = JSON.parse(res) as {
          rounds?: DriveRound[] | null;
          applications?: Applicant[] | null;
          applicants?: Applicant[] | null;
        };

        return {
          rounds: parsed.rounds ?? [],
          applications: parsed.applications ?? parsed.applicants ?? []
        };
      } catch {
        console.error('Backend returned non-JSON:', res.substring(0, 200));
        throw new Error('Backend returned HTML instead of JSON. Check backend logs.');
      }
    }

    if (!res || typeof res !== 'object') {
      return { rounds: [], applications: [] };
    }

    const response = res as {
      rounds?: DriveRound[] | null;
      applications?: Applicant[] | null;
      applicants?: Applicant[] | null;
    };

    const rounds = response.rounds ?? [];
    const applications = response.applications ?? response.applicants ?? [];

    return { rounds, applications };
  }

  loadApplicants(): void {
    this.loading = true;
    this.placementService.getApplicationsForDrive(this.driveId).subscribe({
      next: (res) => {
        const normalized = this.normalizeApplicantsResponse(res);
        this.rounds = normalized.rounds ?? [];
        this.applicants = (normalized.applications ?? []).map((applicant) => ({
          ...applicant,
          selected: false
        }));
        this.displayedColumns = [
          'select',
          'student',
          ...this.rounds.map((round) => `round_${round.round_id}`),
          'result'
        ];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load applicants', err);
        this.loading = false;
        const errorMessage = typeof err.error === 'string'
          ? err.error
          : err.error?.error || 'Failed to load applicants';
        this.showToast(errorMessage, 'error');
      }
    });
  }

  applyFilters(): void {
    let list = [...this.applicants];

    if (this.filterRoundId && this.filterStatus) {
      const selectedRound = this.rounds.find((round) => round.round_id === this.filterRoundId);
      if (selectedRound) {
        list = list.filter((applicant) => this.getRoundStatus(applicant, selectedRound).status === this.filterStatus);
      }
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((applicant) =>
        applicant.student_name?.toLowerCase().includes(q) ||
        applicant.roll_number?.toLowerCase().includes(q)
      );
    }

    this.filteredApplicants = list;
  }

  get selectedApplicants(): Applicant[] {
    return this.applicants.filter((applicant) => applicant.selected);
  }

  get allFilteredSelected(): boolean {
    return this.filteredApplicants.length > 0 && this.filteredApplicants.every((applicant) => applicant.selected);
  }

  get someFilteredSelected(): boolean {
    return this.filteredApplicants.some((applicant) => applicant.selected) && !this.allFilteredSelected;
  }

  getRoundStatus(applicant: Applicant, round: DriveRound): RoundStatus {
    return applicant.rounds.find((item) => item.round_id === round.round_id) || {
      round_id: round.round_id,
      round_name: round.round_name,
      round_order: round.round_order,
      status: 'NOT_REACHED',
      remarks: null
    };
  }

  isRoundReachable(applicant: Applicant, round: DriveRound): boolean {
    if (round.round_order === 1) return true;
    const previousRound = this.rounds.find((item) => item.round_order === round.round_order - 1);
    if (!previousRound) return false;
    return this.getRoundStatus(applicant, previousRound).status === 'CLEARED';
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onRoundFilterChange(value: number | null): void {
    this.filterRoundId = value;
    this.applyFilters();
  }

  onStatusFilterChange(value: 'PENDING' | 'CLEARED' | 'REJECTED' | 'ABSENT' | null): void {
    this.filterStatus = value;
    this.applyFilters();
  }

  get bulkTargetApplicants(): Applicant[] {
    return this.selectedApplicants.length > 0 ? this.selectedApplicants : this.filteredApplicants;
  }

  toggleSelectAll(checked: boolean): void {
    this.filteredApplicants.forEach((applicant) => {
      applicant.selected = checked;
    });
  }

  onToggleApplicant(applicant: Applicant, checked: boolean): void {
    applicant.selected = checked;
  }

  openManageRoundsDialog(): void {
    if (this.rounds.length > 0) {
      this.showToast('Rounds are already defined for this drive. This action currently supports first-time setup only.', 'error');
      return;
    }

    const dialogRef = this.dialog.open(ManageRoundsDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { driveId: this.driveId }
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.showToast('Rounds created successfully', 'success');
        this.loadApplicants();
      }
    });
  }

  updateRoundStatus(applicant: Applicant, round: DriveRound, event: MatButtonToggleChange): void {
    const nextStatus = event.value as RoundStatus['status'];
    if (nextStatus === 'NOT_REACHED') return;

    const currentStatus = this.getRoundStatus(applicant, round);
    if (currentStatus.status === nextStatus) return;

    const originalRounds = applicant.rounds.map((item) => ({ ...item }));
    const roundIndex = applicant.rounds.findIndex((item) => item.round_id === round.round_id);
    const updatedRound: RoundStatus = {
      round_id: round.round_id,
      round_name: round.round_name,
      round_order: round.round_order,
      status: nextStatus,
      remarks: currentStatus.remarks ?? null
    };

    if (roundIndex >= 0) {
      applicant.rounds[roundIndex] = updatedRound;
    } else {
      applicant.rounds = [...applicant.rounds, updatedRound];
    }
    this.applyFilters();

    this.updatingId = applicant.application_id;
    this.http.patch(
      `${this.applicationApi}/${applicant.application_id}/rounds/${round.round_id}`,
      { status: nextStatus },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.updatingId = null;
        this.showToast(`${applicant.student_name} marked ${nextStatus} for ${round.round_name}`, 'success');
        this.loadApplicants();
      },
      error: (err) => {
        applicant.rounds = originalRounds;
        this.applyFilters();
        this.updatingId = null;
        this.showToast(err.error?.error || 'Failed to update round status', 'error');
      }
    });
  }

  bulkUpdate(status: 'CLEARED' | 'REJECTED' | 'ABSENT'): void {
    if (!this.filterRoundId) {
      this.showToast('Select a round filter first', 'error');
      return;
    }

    const targets = this.bulkTargetApplicants;
    if (!targets.length) {
      this.showToast('No applicants available for this round filter', 'error');
      return;
    }

    this.bulkUpdating = true;
    this.http.post(
      `${this.driveApi}/${this.driveId}/rounds/${this.filterRoundId}/bulk-update`,
      {
        updates: targets.map((applicant) => ({
          application_id: applicant.application_id,
          status
        }))
      },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.bulkUpdating = false;
        this.showToast(`${targets.length} applicant(s) updated to ${status}`, 'success');
        this.loadApplicants();
      },
      error: (err) => {
        this.bulkUpdating = false;
        this.showToast(err.error?.error || 'Bulk update failed', 'error');
      }
    });
  }

  sendAnnouncement(): void {
    const title = this.announcementTitle.trim();
    const message = this.announcementMessage.trim();

    if (!title || !message) {
      this.showToast('Announcement title and message are required', 'error');
      return;
    }

    this.sendingAnnouncement = true;
    this.notificationsService.sendDriveAnnouncement({
      driveId: this.driveId,
      audience: this.announcementAudience,
      title,
      message,
      link: this.announcementLink.trim() || `/drives/${this.driveId}`
    }).subscribe({
      next: (response: any) => {
        this.sendingAnnouncement = false;
        this.announcementTitle = '';
        this.announcementMessage = '';
        this.announcementLink = '';
        this.showToast(`Notification sent to ${response?.created ?? 0} student(s)`, 'success');
      },
      error: (err) => {
        this.sendingAnnouncement = false;
        this.showToast(err.error?.message || 'Failed to send announcement', 'error');
      }
    });
  }

  getRoundCellClass(applicant: Applicant, round: DriveRound): string {
    const status = this.getRoundStatus(applicant, round).status;
    if (status === 'CLEARED') return 'cell-cleared';
    if (status === 'REJECTED') return 'cell-rejected';
    if (status === 'ABSENT') return 'cell-rejected';
    if (status === 'PENDING') return 'cell-pending';
    return '';
  }

  getResultBadgeClass(result: Applicant['result']): string {
    if (result === 'SELECTED') return 'badge-selected';
    if (result === 'REJECTED') return 'badge-rejected';
    if (result === 'ABSENT') return 'badge-rejected';
    return 'badge-pending';
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3200,
      panelClass: type === 'success' ? 'snack-success' : 'snack-error'
    });
  }

  trackByApplicationId(_index: number, applicant: Applicant): number {
    return applicant.application_id;
  }

  trackByRoundId(_index: number, round: DriveRound): number {
    return round.round_id;
  }

  private splitStudentName(applicant: Applicant): { first: string; middle: string; last: string } {
    const parts = (applicant.student_name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return { first: '', middle: '', last: '' };
    }
    if (parts.length === 1) {
      return { first: parts[0], middle: '', last: '' };
    }
    if (parts.length === 2) {
      return { first: parts[0], middle: '', last: parts[1] };
    }

    return {
      first: parts[0],
      middle: parts.slice(1, -1).join(' '),
      last: parts[parts.length - 1]
    };
  }

  private getExportNames(applicant: Applicant): { first: string; middle: string; last: string } {
    const split = this.splitStudentName(applicant);
    return {
      first: this.pickFirstNonEmpty(applicant.first_name, split.first),
      middle: this.pickFirstNonEmpty(applicant.middle_name, split.middle),
      last: this.pickFirstNonEmpty(applicant.last_name, split.last)
    };
  }

  private pickFirstNonEmpty<T>(...values: Array<T | null | undefined>): T | '' {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'string') {
        if (value.trim() !== '') return value as T;
        continue;
      }
      return value as T;
    }
    return '';
  }

  exportToCsv(): void {
    const exportApplicants = this.selectedApplicants.length > 0
      ? this.selectedApplicants
      : this.filteredApplicants;

    const headers = [
      'Program',
      'Batch',
      'Placement Status',
      'College Email',
      'PRN',
      'First Name',
      'Middle Name',
      'Last Name',
      'Personal Email',
      'Date of Birth',
      'Gender',
      'Phone Number',
      'WhatsApp Number',
      'WhatsApp Link',
      'LinkedIn Profile URL',
      'City',
      'State',
      'Country',
      'Std X Percentage',
      'Std X CGPA',
      'Std XII Percentage',
      'Std XII CGPA',
      'UG Course',
      'UG Specialization',
      'UG University',
      'UG Percentage',
      'UG CGPA',
      'UG Year',
      'Educational Background',
      'SICSR Program Name',
      'SICSR Specialization',
      'Sem 1 GPA',
      'Sem 2 GPA',
      'Sem 3 GPA',
      'Final CGPA',
      'Backlog',
      'Interested Job Roles',
      'Work Experience',
      'Total Work Experience',
      'Last Company Name',
      'Last Company Industry',
      'Applied Resume Name',
      'Applied Resume Link'
    ];
    const rows = exportApplicants.map((applicant) => {
      const names = this.getExportNames(applicant);
      return [
        this.pickFirstNonEmpty(applicant.program_name),
        this.pickFirstNonEmpty((applicant as Applicant & { program_batch?: string | null }).program_batch),
        this.pickFirstNonEmpty(applicant.status),
        this.pickFirstNonEmpty(applicant.college_email, applicant.email),
        this.pickFirstNonEmpty(applicant.prn, applicant.roll_number),
        names.first,
        names.middle,
        names.last,
        this.pickFirstNonEmpty(applicant.personal_email),
        this.pickFirstNonEmpty(applicant.date_of_birth),
        this.pickFirstNonEmpty(applicant.gender),
        this.pickFirstNonEmpty(applicant.phone_number),
        this.pickFirstNonEmpty(applicant.whatsapp_number, applicant.phone_number),
        this.pickFirstNonEmpty(applicant.whatsapp_link),
        this.pickFirstNonEmpty(applicant.linkedin_profile_url),
        this.pickFirstNonEmpty(applicant.city),
        this.pickFirstNonEmpty(applicant.state),
        this.pickFirstNonEmpty(applicant.country),
        this.pickFirstNonEmpty(applicant.std_x_percentage),
        this.pickFirstNonEmpty(applicant.std_x_cgpa),
        this.pickFirstNonEmpty(applicant.std_xii_percentage),
        this.pickFirstNonEmpty(applicant.std_xii_cgpa),
        this.pickFirstNonEmpty(applicant.ug_course_name),
        this.pickFirstNonEmpty(applicant.ug_specialization),
        this.pickFirstNonEmpty(applicant.ug_university),
        this.pickFirstNonEmpty(applicant.ug_percentage),
        this.pickFirstNonEmpty(applicant.ug_cgpa),
        this.pickFirstNonEmpty(applicant.ug_year),
        this.pickFirstNonEmpty(applicant.educational_background),
        this.pickFirstNonEmpty(applicant.sicsr_program_name, applicant.program_name),
        this.pickFirstNonEmpty(applicant.sicsr_specialization),
        this.pickFirstNonEmpty(applicant.sem1_gpa),
        this.pickFirstNonEmpty(applicant.sem2_gpa),
        this.pickFirstNonEmpty(applicant.sem3_gpa),
        this.pickFirstNonEmpty(applicant.cgpa),
        applicant.backlog ? 'Yes' : 'No',
        this.pickFirstNonEmpty(applicant.interested_job_roles),
        applicant.work_experience ? 'Yes' : 'No',
        this.pickFirstNonEmpty(applicant.total_work_experience),
        this.pickFirstNonEmpty(applicant.last_company_name),
        this.pickFirstNonEmpty(applicant.last_company_industry),
        this.pickFirstNonEmpty(applicant.applied_cv_name),
        this.pickFirstNonEmpty(this.getApplicantResumeUrl(applicant))
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${value ?? ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `drive-${this.driveId}-round-status.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  exportResumesZip(): void {
    const exportApplicants = this.selectedApplicants.length > 0
      ? this.selectedApplicants
      : this.filteredApplicants;

    const applicationIds = exportApplicants.map((applicant) => applicant.application_id).filter(Boolean);

    if (!applicationIds.length) {
      this.showToast('No applicants available to export', 'error');
      return;
    }

    this.exportZipLoading = true;
    this.http.post(
      `${this.driveApi}/${this.driveId}/export-resumes`,
      { applicationIds },
      { headers: this.getHeaders(), responseType: 'blob' }
    ).subscribe({
      next: (blob) => {
        this.exportZipLoading = false;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `drive-${this.driveId}-applicant-resumes.zip`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.exportZipLoading = false;
        this.showToast(err?.error?.error || 'Failed to export applicant resumes ZIP', 'error');
      }
    });
  }

  getApplicantResumeUrl(applicant: Applicant): string | null {
    if (!applicant.applied_cv_link) {
      return null;
    }

    if (applicant.applied_cv_link.startsWith('http')) {
      return applicant.applied_cv_link;
    }

    return buildBackendUrl(applicant.applied_cv_link);
  }

  goBack(): void {
    this.router.navigate(['/placement-drives/open-drives']);
  }

  get totalCount(): number {
    return this.applicants.length;
  }

  get pendingCount(): number {
    return this.applicants.filter((applicant) => applicant.result === 'PENDING').length;
  }

  get selectedCount(): number {
    return this.applicants.filter((applicant) => applicant.result === 'SELECTED').length;
  }

  get rejectedCount(): number {
    return this.applicants.filter((applicant) => applicant.result === 'REJECTED').length;
  }

  get absentCount(): number {
    return this.applicants.filter((applicant) => applicant.result === 'ABSENT').length;
  }
}
