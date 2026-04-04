import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { buildApiUrl } from '../../../api.config';
import { AuthService } from '../../../auth/auth';

@Component({
  selector: 'app-closed-drives',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './closed-drives.html',
  styleUrls: ['./closed-drives.scss']
})
export class ClosedDrives implements OnInit {

  drives: any[] = [];
  selectedProgram = '';
  selectedBatch = '';
  searchTerm = '';
  loading = true;

  private readonly baseUrl = buildApiUrl('placement-drives');

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() { this.loadDrives(); }

  loadDrives() {
    this.loading = true;
    this.http.get<{ drives: any[] }>(`${this.baseUrl}/closed`, { headers: this.authService.getAuthHeaders() })
      .subscribe({
        next:  res => { this.drives = res.drives || []; this.loading = false; },
        error: err => { console.error(err); this.loading = false; }
      });
  }

  // Navigate to edit form with reopen mode
  reopenDrive(id: number) {
    this.router.navigate(['/placement-drives/edit', id], {
      queryParams: { mode: 'reopen' }
    });
  }

  viewApplicants(id: number) {
    this.router.navigate(['/placement-drives/applicants', id]);
  }

  get filteredDrives(): any[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.drives.filter((drive) => {
      const matchesProgram =
        !this.selectedProgram ||
        this.extractPrograms(drive).includes(this.selectedProgram);

      const matchesBatch =
        !this.selectedBatch || String(drive.eligible_batch ?? '').trim() === this.selectedBatch;

      const haystack = [
        drive.company_name,
        drive.job_role,
        drive.description,
        drive.ctc,
        drive.eligible_batch,
        drive.close_type,
        ...this.extractPrograms(drive)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);

      return matchesProgram && matchesBatch && matchesSearch;
    });
  }

  get availablePrograms(): string[] {
    return Array.from(
      new Set(this.drives.flatMap((drive) => this.extractPrograms(drive)))
    ).sort((a, b) => a.localeCompare(b));
  }

  get availableBatches(): string[] {
    return Array.from(
      new Set(
        this.drives
          .map((drive) => String(drive.eligible_batch ?? '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  private extractPrograms(drive: any): string[] {
    const raw = drive.eligible_programs ?? drive.programs ?? drive.program_name ?? '';

    if (Array.isArray(raw)) {
      return raw.filter(Boolean).map((program) => String(program).trim());
    }

    return String(raw)
      .split(',')
      .map((program) => program.trim())
      .filter(Boolean);
  }

}
