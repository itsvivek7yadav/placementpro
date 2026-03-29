import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-create-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-test.html',
  styleUrls: ['./create-test.scss']
})
export class CreateTest implements OnInit {

  testForm!: FormGroup;
  programs:         any[]    = [];
  selectedPrograms: number[] = [];
  dropdownOpen      = false;

  uploadedFile:     File | null = null;
  previewQuestions: any[]       = [];
  uploadErrors:     string[]    = [];
  uploadSuccess     = false;

  loading  = false;
  errorMsg = '';
  successMsg = '';

  private API = 'http://localhost:5050/api';

  constructor(
    private fb:     FormBuilder,
    private http:   HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadPrograms();
  }

  private initForm() {
    this.testForm = this.fb.group({
      title:          ['', Validators.required],
      description:    [''],
      duration_mins:  [60, [Validators.required, Validators.min(1)]],
      start_time:     ['', Validators.required],
      end_time:       ['', Validators.required],
      eligible_batch: ['2024-26', Validators.required],
      eligible_programs: [[], this.atLeastOne()]
    });
  }

  private atLeastOne() {
    return (control: any) =>
      Array.isArray(control.value) && control.value.length > 0
        ? null : { required: true };
  }

  loadPrograms() {
    this.http.get<any>(`${this.API}/programs`).subscribe({
      next: res => this.programs = res.programs || []
    });
  }

  toggleDropdown() { this.dropdownOpen = !this.dropdownOpen; }

  toggleProgram(id: number) {
    const numId = Number(id);
    if (this.selectedPrograms.includes(numId)) {
      this.selectedPrograms = this.selectedPrograms.filter(p => p !== numId);
    } else {
      this.selectedPrograms.push(numId);
    }
    this.testForm.patchValue({ eligible_programs: [...this.selectedPrograms] });
  }

  getProgramName(id: number): string {
    return this.programs.find(p => p.program_id === id)?.program_name || '';
  }

  // ── Download blank template ───────────────────────────
  downloadTemplate() {
    const template = [
      {
        'Question':       'Sample: What is Angular?',
        'Option A':       'A JavaScript framework',
        'Option B':       'A CSS library',
        'Option C':       'A database',
        'Option D':       'A programming language',
        'Correct Answer': 'A',
        'Marks':          1
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);

    // Set column widths
    ws['!cols'] = [
      { wch: 50 }, { wch: 25 }, { wch: 25 },
      { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 8 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'question_template.xlsx');
  }

  // ── Handle file selection ─────────────────────────────
  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.parseExcel(input.files[0]);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.parseExcel(file);
  }

  parseExcel(file: File) {
    this.uploadedFile  = file;
    this.uploadErrors  = [];
    this.previewQuestions = [];
    this.uploadSuccess = false;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const workbook  = XLSX.read(e.target.result, { type: 'binary' });
        const sheet     = workbook.Sheets[workbook.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(sheet);

        const validAnswers = ['A', 'B', 'C', 'D'];
        const questions: any[] = [];
        const errors: string[] = [];

        data.forEach((row, index) => {
          const rowNum      = index + 2;
          const question    = row['Question']?.toString().trim();
          const option_a    = row['Option A']?.toString().trim();
          const option_b    = row['Option B']?.toString().trim();
          const option_c    = row['Option C']?.toString().trim();
          const option_d    = row['Option D']?.toString().trim();
          const correct_ans = row['Correct Answer']?.toString().trim().toUpperCase();
          const marks       = Number(row['Marks']) || 1;

          if (!question || !option_a || !option_b || !option_c || !option_d) {
            errors.push(`Row ${rowNum}: Missing required fields`);
            return;
          }
          if (!validAnswers.includes(correct_ans)) {
            errors.push(`Row ${rowNum}: Correct Answer must be A, B, C or D`);
            return;
          }

          questions.push({ question, option_a, option_b, option_c, option_d, correct_ans, marks });
        });

        if (errors.length > 0) {
          this.uploadErrors = errors;
        } else {
          this.previewQuestions = questions;
          this.uploadSuccess    = true;
        }

      } catch (err) {
        this.uploadErrors = ['Could not read file. Make sure it is a valid .xlsx file.'];
      }
    };
    reader.readAsBinaryString(file);
  }

  // ── Submit ────────────────────────────────────────────
  async submit(publishNow: boolean) {
    if (this.testForm.invalid) {
      this.errorMsg = 'Please fill all required fields';
      return;
    }
    if (this.previewQuestions.length === 0) {
      this.errorMsg = 'Please upload questions before saving';
      return;
    }

    this.loading  = true;
    this.errorMsg = '';

    const payload = {
      ...this.testForm.value,
      status: publishNow ? 'DRAFT' : 'DRAFT' // always draft first
    };

    this.http.post<any>(`${this.API}/mock-tests`, payload).subscribe({
      next: async (res) => {
        const testId = res.test_id;
        await this.uploadQuestionsToServer(testId, publishNow);
      },
      error: err => {
        this.errorMsg = err.error?.message || 'Failed to create test';
        this.loading  = false;
      }
    });
  }

  private uploadQuestionsToServer(testId: number, publishNow: boolean) {
    if (!this.uploadedFile) return;

    const formData = new FormData();
    formData.append('file', this.uploadedFile);

    this.http.post<any>(
      `${this.API}/mock-tests/${testId}/upload-questions`, formData
    ).subscribe({
      next: () => {
        if (publishNow) {
          this.http.put(`${this.API}/mock-tests/${testId}/publish`, {}).subscribe({
            next: () => {
              this.successMsg = 'Test published successfully!';
              setTimeout(() => this.router.navigate(['/mock-tests']), 1200);
            },
            error: err => {
              this.errorMsg = err.error?.message || 'Failed to publish';
              this.loading  = false;
            }
          });
        } else {
          this.successMsg = 'Test saved as draft!';
          setTimeout(() => this.router.navigate(['/mock-tests']), 1200);
        }
      },
      error: err => {
        this.errorMsg = err.error?.message || 'Failed to upload questions';
        this.loading  = false;
      }
    });
  }

  cancel() { this.router.navigate(['/mock-tests']); }
}
