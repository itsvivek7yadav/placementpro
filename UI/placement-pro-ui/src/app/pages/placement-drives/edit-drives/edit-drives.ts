import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { buildApiUrl, buildBackendUrl } from '../../../api.config';
import { AuthService } from '../../../auth/auth';

@Component({
  selector: 'app-edit-drive',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-drives.html',
  styleUrls: ['./edit-drives.scss']
})
export class EditDrive implements OnInit {

  driveForm!: FormGroup;
  programs: any[]         = [];
  selectedPrograms: number[] = [];
  dropdownOpen            = false;

  loading   = true;  // page load
  saving    = false; // form submit
  isReopen  = false; // mode from query param

  driveId!: number;
  successMessage = '';
  errorMessage   = '';
  selectedDocument: File | null = null;
  selectedDocumentName = '';
  currentDocumentUrl = '';
  currentDocumentName = '';
  removeCurrentDocument = false;

  private readonly baseUrl = buildApiUrl('placement-drives');

  constructor(
    private fb:     FormBuilder,
    private http:   HttpClient,
    private route:  ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.driveId = Number(this.route.snapshot.paramMap.get('id'));
    this.isReopen = this.route.snapshot.queryParamMap.get('mode') === 'reopen';
    this.initForm();
    this.loadPrograms();
  }

  private initForm() {
    this.driveForm = this.fb.group({
      company_name:         ['', Validators.required],
      job_role:             ['', Validators.required],
      description:          [''],
      job_type:             ['FTE', Validators.required],
      ctc:                  [''],
      eligible_batch:       ['2024-26', Validators.required],
      min_cgpa:             [0, [Validators.min(0), Validators.max(10)]],
      application_deadline: ['', Validators.required],  // always required
      eligible_programs:    [[], Validators.required]
    });
  }

  loadPrograms() {
    this.http.get<any>(buildApiUrl('programs')).subscribe({
      next: res => {
        this.programs = res.programs || [];
        this.loadDrive(); // load drive only after programs are ready
      },
      error: () => { this.loadDrive(); }
    });
  }

  loadDrive() {
    this.http.get<any>(`${this.baseUrl}/${this.driveId}`, { headers: this.authService.getAuthHeaders() })
      .subscribe({
        next: res => {
          const d = res.drive;

          // Format deadline for datetime-local input (YYYY-MM-DDTHH:MM)
          const deadline = d.application_deadline
            ? new Date(d.application_deadline).toISOString().slice(0, 16)
            : '';

          this.driveForm.patchValue({
            company_name:         d.company_name   || '',
            job_role:             d.job_role        || '',
            description:          d.description     || '',
            job_type:             d.job_type        || 'FTE',
            ctc:                  d.ctc             || '',
            eligible_batch:       d.eligible_batch  || '2024-26',
            min_cgpa:             d.min_cgpa        || 0,
            // For reopen: clear deadline so TPO must enter a new one
            // For edit:   pre-fill existing deadline
            application_deadline: this.isReopen ? '' : deadline,
            eligible_programs:    res.selectedProgramIds || []
          });

          this.selectedPrograms = res.selectedProgramIds || [];
          this.currentDocumentUrl = d.drive_document_url
            ? buildBackendUrl(d.drive_document_url)
            : '';
          this.currentDocumentName = d.drive_document_url
            ? String(d.drive_document_url).split('/').pop() || 'Attached document'
            : '';
          this.removeCurrentDocument = false;
          this.selectedDocument = null;
          this.selectedDocumentName = '';
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.errorMessage = 'Failed to load drive details';
          this.loading = false;
        }
      });
  }

  toggleDropdown() { this.dropdownOpen = !this.dropdownOpen; }

  toggleProgram(id: number) {
    if (this.selectedPrograms.includes(id)) {
      this.selectedPrograms = this.selectedPrograms.filter(p => p !== id);
    } else {
      this.selectedPrograms.push(id);
    }
    this.driveForm.patchValue({ eligible_programs: this.selectedPrograms });
  }

  getProgramName(id: number): string {
    return this.programs.find(p => p.program_id === id)?.program_name || '';
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedDocument = file;
    this.selectedDocumentName = file?.name || '';
    if (file) {
      this.removeCurrentDocument = false;
    }
  }

  removeAttachment(): void {
    this.selectedDocument = null;
    this.selectedDocumentName = '';
    this.currentDocumentUrl = '';
    this.currentDocumentName = '';
    this.removeCurrentDocument = true;
  }

  submit() {
    if (this.driveForm.invalid || this.saving) return;
    this.saving = true;
    this.errorMessage   = '';
    this.successMessage = '';

    const endpoint = this.isReopen
      ? `${this.baseUrl}/${this.driveId}/reopen`
      : `${this.baseUrl}/${this.driveId}`;

    const formData = new FormData();
    const formValue = this.driveForm.value;

    Object.entries(formValue).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => formData.append(key, String(item)));
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    if (this.selectedDocument) {
      formData.append('drive_document', this.selectedDocument);
    }

    if (this.removeCurrentDocument) {
      formData.append('remove_drive_document', 'true');
    }

    this.http.put(endpoint, formData, { headers: this.authService.getAuthHeaders() })
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = this.isReopen
            ? 'Drive reopened successfully!'
            : 'Drive updated successfully!';
          setTimeout(() => {
            this.router.navigate([
              this.isReopen
                ? '/placement-drives/closed-drives'
                : '/placement-drives/open-drives'
            ]);
          }, 1200);
        },
        error: err => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Failed to save changes';
        }
      });
  }

  goBack() {
    this.router.navigate([
      this.isReopen
        ? '/placement-drives/closed-drives'
        : '/placement-drives/open-drives'
    ]);
  }
}
