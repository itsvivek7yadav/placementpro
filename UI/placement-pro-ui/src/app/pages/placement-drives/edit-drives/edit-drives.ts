import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
      ctc_min:              [{ value: '', disabled: false }],
      ctc_max:              [{ value: '', disabled: false }],
      ctc_disclosed:        [true],
      stipend_amount:       [{ value: '', disabled: true }],
      stipend_period:       ['MONTHLY'],
      ppo_ctc_min:          [{ value: '', disabled: true }],
      ppo_ctc_max:          [{ value: '', disabled: true }],
      ppo_ctc_disclosed:    [false],
      eligible_batch:       ['2024-26', Validators.required],
      min_cgpa:             [0, [Validators.min(0), Validators.max(10)]],
      application_deadline: ['', Validators.required],  // always required
      eligible_programs:    [[], Validators.required]
    }, { validators: this.compensationValidator });

    this.driveForm.get('job_type')?.valueChanges.subscribe(() => this.applyCompensationState());
    this.driveForm.get('ctc_disclosed')?.valueChanges.subscribe(() => this.applyCompensationState());
    this.driveForm.get('ppo_ctc_disclosed')?.valueChanges.subscribe(() => this.applyCompensationState());
    this.applyCompensationState();
  }

  private compensationValidator = (group: AbstractControl): ValidationErrors | null => {
    const jobType = group.get('job_type')?.value;
    const ctcDisclosed = !!group.get('ctc_disclosed')?.value;
    const ppoDisclosed = !!group.get('ppo_ctc_disclosed')?.value;
    const ctcMin = group.get('ctc_min')?.value;
    const ctcMax = group.get('ctc_max')?.value;
    const stipendAmount = group.get('stipend_amount')?.value;
    const ppoMin = group.get('ppo_ctc_min')?.value;
    const ppoMax = group.get('ppo_ctc_max')?.value;

    if (jobType === 'FTE') {
      if (!ctcDisclosed) return null;
      if (ctcMin === '' || ctcMin == null || ctcMax === '' || ctcMax == null) {
        return { compensationRequired: true };
      }
    }

    if (jobType === 'INTERNSHIP' && (stipendAmount === '' || stipendAmount == null)) {
      return { compensationRequired: true };
    }

    if (jobType === 'INTERNSHIP_PPO') {
      if (stipendAmount === '' || stipendAmount == null) {
        return { compensationRequired: true };
      }
      if (ppoDisclosed && (ppoMin === '' || ppoMin == null || ppoMax === '' || ppoMax == null)) {
        return { compensationRequired: true };
      }
    }

    return null;
  };

  private applyCompensationState(): void {
    const jobType = this.selectedJobType;
    const ctcDisclosed = this.driveForm.get('ctc_disclosed')?.value;
    const ppoDisclosed = this.driveForm.get('ppo_ctc_disclosed')?.value;
    const ctcMinControl = this.driveForm.get('ctc_min');
    const ctcMaxControl = this.driveForm.get('ctc_max');
    const stipendControl = this.driveForm.get('stipend_amount');
    const ppoMinControl = this.driveForm.get('ppo_ctc_min');
    const ppoMaxControl = this.driveForm.get('ppo_ctc_max');

    if (jobType !== 'FTE') {
      this.driveForm.patchValue({ ctc_min: '', ctc_max: '', ctc_disclosed: false }, { emitEvent: false });
    }

    if (jobType === 'FTE' && !ctcDisclosed) {
      this.driveForm.patchValue({ ctc_min: '', ctc_max: '' }, { emitEvent: false });
    }

    if (jobType === 'FTE' || jobType === 'INTERNSHIP') {
      this.driveForm.patchValue({ ppo_ctc_min: '', ppo_ctc_max: '', ppo_ctc_disclosed: false }, { emitEvent: false });
    }

    if (jobType !== 'INTERNSHIP' && jobType !== 'INTERNSHIP_PPO') {
      this.driveForm.patchValue({ stipend_amount: '', stipend_period: 'MONTHLY' }, { emitEvent: false });
    }

    if (jobType === 'INTERNSHIP_PPO' && !ppoDisclosed) {
      this.driveForm.patchValue({ ppo_ctc_min: '', ppo_ctc_max: '' }, { emitEvent: false });
    }

    if (jobType === 'FTE' && ctcDisclosed) {
      ctcMinControl?.enable({ emitEvent: false });
      ctcMaxControl?.enable({ emitEvent: false });
    } else {
      ctcMinControl?.disable({ emitEvent: false });
      ctcMaxControl?.disable({ emitEvent: false });
    }

    if (jobType === 'INTERNSHIP' || jobType === 'INTERNSHIP_PPO') {
      stipendControl?.enable({ emitEvent: false });
    } else {
      stipendControl?.disable({ emitEvent: false });
    }

    if (jobType === 'INTERNSHIP_PPO' && ppoDisclosed) {
      ppoMinControl?.enable({ emitEvent: false });
      ppoMaxControl?.enable({ emitEvent: false });
    } else {
      ppoMinControl?.disable({ emitEvent: false });
      ppoMaxControl?.disable({ emitEvent: false });
    }

    this.driveForm.updateValueAndValidity({ emitEvent: false });
  }

  get selectedJobType(): 'FTE' | 'INTERNSHIP' | 'INTERNSHIP_PPO' {
    return this.driveForm.get('job_type')?.value || 'FTE';
  }

  get isFte(): boolean {
    return this.selectedJobType === 'FTE';
  }

  get isInternship(): boolean {
    return this.selectedJobType === 'INTERNSHIP';
  }

  get isInternshipPpo(): boolean {
    return this.selectedJobType === 'INTERNSHIP_PPO';
  }

  get isCtcDisclosed(): boolean {
    return !!this.driveForm.get('ctc_disclosed')?.value;
  }

  get isPpoCtcDisclosed(): boolean {
    return !!this.driveForm.get('ppo_ctc_disclosed')?.value;
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
            ctc_min:              d.ctc_min         ?? '',
            ctc_max:              d.ctc_max         ?? '',
            ctc_disclosed:        !!d.ctc_disclosed,
            stipend_amount:       d.stipend_amount  ?? '',
            stipend_period:       d.stipend_period  || 'MONTHLY',
            ppo_ctc_min:          d.ppo_ctc_min     ?? '',
            ppo_ctc_max:          d.ppo_ctc_max     ?? '',
            ppo_ctc_disclosed:    !!d.ppo_ctc_disclosed,
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
          this.applyCompensationState();
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
