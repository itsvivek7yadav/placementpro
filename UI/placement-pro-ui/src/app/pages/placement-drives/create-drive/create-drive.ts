import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { buildApiUrl } from '../../../api.config';

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
  selectedDocument: File | null = null;
  selectedDocumentName = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private elementRef: ElementRef<HTMLElement>
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
      ctc_min: [{ value: '', disabled: false }],
      ctc_max: [{ value: '', disabled: false }],
      ctc_disclosed: [true],
      stipend_amount: [{ value: '', disabled: true }],
      stipend_period: ['MONTHLY'],
      ppo_ctc_min: [{ value: '', disabled: true }],
      ppo_ctc_max: [{ value: '', disabled: true }],
      ppo_ctc_disclosed: [false],
      application_deadline: ['', Validators.required],
      eligible_programs: [[], this.atLeastOneProgram()],
      eligible_batch: ['2024-26', Validators.required],
      min_cgpa: [0, [Validators.required, Validators.min(0), Validators.max(10)]]
    }, { validators: this.compensationValidator });

    this.driveForm.get('job_type')?.valueChanges.subscribe(() => this.applyCompensationState());
    this.driveForm.get('ctc_disclosed')?.valueChanges.subscribe(() => this.applyCompensationState());
    this.driveForm.get('ppo_ctc_disclosed')?.valueChanges.subscribe(() => this.applyCompensationState());
    this.applyCompensationState();
  }

  private atLeastOneProgram() {
    return (control: any) => {
      return Array.isArray(control.value) && control.value.length > 0
        ? null
        : { required: true };
    };
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

    if (jobType === 'INTERNSHIP') {
      if (stipendAmount === '' || stipendAmount == null) {
        return { compensationRequired: true };
      }
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
      this.driveForm.patchValue(
        { ppo_ctc_min: '', ppo_ctc_max: '', ppo_ctc_disclosed: false },
        { emitEvent: false }
      );
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

  loadPrograms(): void {
    this.http.get<any>(buildApiUrl('programs'))
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

  closeDropdown(): void {
    this.dropdownOpen = false;
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
  }

  selectAllPrograms(): void {
    this.selectedPrograms = this.programs.map(program => Number(program.program_id));
    this.driveForm.patchValue({
      eligible_programs: [...this.selectedPrograms]
    });
  }

  clearPrograms(): void {
    this.selectedPrograms = [];
    this.driveForm.patchValue({
      eligible_programs: []
    });
    this.driveForm.get('eligible_programs')?.markAsTouched();
  }

  isAllProgramsSelected(): boolean {
    return this.programs.length > 0 && this.selectedPrograms.length === this.programs.length;
  }

  get selectedProgramsSummary(): string {
    if (this.selectedPrograms.length === 0) {
      return 'Select Programs';
    }

    if (this.selectedPrograms.length === 1) {
      return this.getProgramName(this.selectedPrograms[0]);
    }

    return `${this.selectedPrograms.length} programs selected`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen) return;

    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
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

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedDocument = file;
    this.selectedDocumentName = file?.name || '';
  }

  clearSelectedDocument(): void {
    this.selectedDocument = null;
    this.selectedDocumentName = '';
  }

  submit() {
    if (this.driveForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

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

    this.http.post(buildApiUrl('placement-drives'), formData).subscribe({
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
