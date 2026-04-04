import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { buildApiUrl, buildBackendUrl } from '../../api.config';

@Component({
  selector: 'app-drive-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './drive-detail.html',
  styleUrls: ['./drive-detail.scss']
})
export class DriveDetail implements OnInit {

  drive: any = null;
  loading = true;
  applying = false;
  errorMessage = '';
  resumeOptions: Array<{ slot: number; name: string; path: string }> = [];
  resumePickerOpen = false;
  selectedResumeSlot: number | null = null;
  shouldAutoOpenPicker = false;

  private readonly API = buildApiUrl();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.shouldAutoOpenPicker = this.route.snapshot.queryParamMap.get('apply') === 'true';
    this.loadResumeOptions();
    if (id) this.loadDrive(+id);
  }

  loadDrive(id: number): void {
    this.http.get<any>(`${this.API}/student-drives/${id}`).subscribe({
      next: (res) => {
        this.drive = res.drive;
        this.loading = false;
        this.tryAutoOpenResumePicker();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage = 'Failed to load drive details';
      }
    });
  }

  get driveDocumentUrl(): string {
    if (!this.drive?.drive_document_url) {
      return '#';
    }

    if (this.drive.drive_document_url.startsWith('http')) {
      return this.drive.drive_document_url;
    }

    return `${this.API}${this.drive.drive_document_url}`;
  }

  get selectedResume(): { slot: number; name: string; path: string } | undefined {
    return this.resumeOptions.find((resume) => resume.slot === this.selectedResumeSlot);
  }

  getResumeUrl(path: string): string {
    return buildBackendUrl(path);
  }

  loadResumeOptions(): void {
    this.http.get<any>(`${this.API}/student-profile/resumes`).subscribe({
      next: (res) => {
        this.resumeOptions = res.resumes || [];
        if (this.resumeOptions.length === 1) {
          this.selectedResumeSlot = this.resumeOptions[0].slot;
        }
        this.tryAutoOpenResumePicker();
      },
      error: () => {
        this.resumeOptions = [];
      }
    });
  }

  tryAutoOpenResumePicker(): void {
    if (!this.shouldAutoOpenPicker || !this.drive || this.drive.my_application_id || this.loading) {
      return;
    }

    if (!this.resumeOptions.length) {
      this.errorMessage = 'Please upload at least one resume in your profile before applying.';
      this.shouldAutoOpenPicker = false;
      return;
    }

    this.openResumePicker();
    this.shouldAutoOpenPicker = false;
  }

  apply(): void {
    if (!this.drive) return;
    this.openResumePicker();
  }

  openResumePicker(): void {
    if (!this.resumeOptions.length) {
      this.errorMessage = 'Please upload at least one resume in your profile before applying.';
      return;
    }

    this.resumePickerOpen = true;
    if (!this.selectedResumeSlot) {
      this.selectedResumeSlot = this.resumeOptions[0].slot;
    }
  }

  closeResumePicker(): void {
    this.resumePickerOpen = false;
  }

  goToProfile(): void {
    this.router.navigate(['/student-profile']);
  }

  applyNow(driveId: number): void {
    if (!this.selectedResumeSlot) {
      this.errorMessage = 'Select a resume to continue.';
      return;
    }

    this.applying = true;
    this.errorMessage = '';

    this.http.post<any>(`${this.API}/applications/apply`, {
      drive_id: driveId,
      resume_slot: this.selectedResumeSlot
    })
      .subscribe({
        next: (res) => {
          this.drive.my_application_id = res.application_id;
          this.applying = false;
          this.resumePickerOpen = false;
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = err?.error?.message || 'Failed to apply';
          this.applying = false;
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/drives']);
  }
}
