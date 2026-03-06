import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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

  private baseUrl = 'http://localhost:5050/api/drives';

  constructor(
    private fb:     FormBuilder,
    private http:   HttpClient,
    private route:  ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.driveId = Number(this.route.snapshot.paramMap.get('id'));
    this.isReopen = this.route.snapshot.queryParamMap.get('mode') === 'reopen';
    this.initForm();
    this.loadPrograms();
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
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
    this.http.get<any>('http://localhost:5050/api/programs').subscribe({
      next: res => {
        this.programs = res.programs || [];
        this.loadDrive(); // load drive only after programs are ready
      },
      error: () => { this.loadDrive(); }
    });
  }

  loadDrive() {
    this.http.get<any>(`${this.baseUrl}/${this.driveId}`, { headers: this.headers() })
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

  submit() {
    if (this.driveForm.invalid || this.saving) return;
    this.saving = true;
    this.errorMessage   = '';
    this.successMessage = '';

    const endpoint = this.isReopen
      ? `${this.baseUrl}/${this.driveId}/reopen`
      : `${this.baseUrl}/${this.driveId}`;

    this.http.put(endpoint, this.driveForm.value, { headers: this.headers() })
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
