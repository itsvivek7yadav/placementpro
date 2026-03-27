import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-create-drive',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-drive.html',
  styleUrls: ['./create-drive.scss']
})
export class CreateDrive implements OnInit {

  driveForm!: FormGroup;

  programs: any[] = [];
  selectedPrograms: number[] = [];

  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadPrograms();
  }

  private initializeForm(): void {
    this.driveForm = this.fb.group({
      company_name: ['', Validators.required],
      job_role: ['', Validators.required],
      description: ['', Validators.required],
      job_type: ['FTE', Validators.required],
      ctc: ['', Validators.required],
      application_deadline: ['', Validators.required],
      eligible_programs: [[], this.atLeastOneProgram()],
      eligible_batch: ['2024-26', Validators.required],
      min_cgpa: [0, [Validators.required, Validators.min(0), Validators.max(10)]]
    });
  }

  private atLeastOneProgram() {
    return (control: any) => {
      return Array.isArray(control.value) && control.value.length > 0
        ? null
        : { required: true };
    };
  }

  loadPrograms(): void {
    this.http.get<any>('http://localhost:5050/api/programs')
      .subscribe({
        next: (res) => {
          this.programs = res.programs || [];
        },
        error: () => {
          console.error('Failed to load programs');
        }
      });
  }

  dropdownOpen = false;

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  toggleProgram(id: number): void {
    const numId = Number(id);
    if (this.selectedPrograms.includes(numId)) {
      this.selectedPrograms = this.selectedPrograms.filter(p => p !== numId);
    } else {
      this.selectedPrograms.push(numId);
    }

    this.driveForm.patchValue({
      eligible_programs: [...this.selectedPrograms]
    });

    console.log('Programs selected:', this.driveForm.value.eligible_programs);
  }

  getProgramName(id: number): string {
    const program = this.programs.find(p => p.program_id === id);
    return program ? program.program_name : '';
  }

  onProgramChange(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.selectedPrograms = Array.from(select.selectedOptions)
      .map(option => Number(option.value));

    this.driveForm.patchValue({
      eligible_programs: this.selectedPrograms
    });
  }

  submit() {
    console.log('Form valid:', this.driveForm.valid);
    console.log('Payload:', this.driveForm.value);

    if (this.driveForm.invalid) return;

    this.loading = true;

    this.http.post('http://localhost:5050/api/placement-drives', this.driveForm.value).subscribe({
      next: () => {
        this.successMessage = 'Drive published successfully';

        setTimeout(() => {
          this.router.navigate(['/placement-drives/open-drives']);
        }, 1200);
      },
      error: () => {
        this.errorMessage = 'Failed to publish drive';
        this.loading = false;
      }
    });
  }
}