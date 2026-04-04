import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { buildApiUrl } from '../../../api.config';
import { AuthService } from '../../../auth/auth';

@Component({
  selector: 'app-open-drives',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './open-drives.html',
  styleUrls: ['./open-drives.scss']
})
export class OpenDrives implements OnInit {

  drives: any[] = [];
  selectedProgram = '';
  searchTerm = '';
  loading    = true;
  closingId: number | null = null;

  private readonly baseUrl = buildApiUrl('placement-drives');

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() { this.loadDrives(); }

  loadDrives() {
    this.loading = true;
    this.http.get<{ drives: any[] }>(`${this.baseUrl}/open`, { headers: this.authService.getAuthHeaders() })
      .subscribe({
        next:  res => { this.drives = res.drives || []; this.loading = false; },
        error: err => { console.error(err); this.loading = false; }
      });
  }

  // Navigate to edit form — loads drive data, stays LIVE
  editDrive(id: number) {
    this.router.navigate(['/placement-drives/edit', id]);
  }

  viewApplicants(id: number) {
    this.router.navigate(['/placement-drives/applicants', id]);
  }

  closeDrive(id: number) {
    if (!confirm('Manually close this drive? The current timestamp will be recorded.')) return;
    this.closingId = id;
    this.http.put(`${this.baseUrl}/${id}/close`, {}, { headers: this.authService.getAuthHeaders() })
      .subscribe({
        next: () => { this.closingId = null; this.loadDrives(); },
        error: err => {
          alert(err?.error?.message || 'Failed to close drive');
          this.closingId = null;
        }
      });
  }

  isDeadlineSoon(deadline: string): boolean {
    const diff = new Date(deadline).getTime() - Date.now();
    return diff > 0 && diff < 48 * 60 * 60 * 1000;
  }

  isDeadlinePassed(deadline: string): boolean {
    return new Date(deadline).getTime() < Date.now();
  }

  get filteredDrives(): any[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.drives.filter((drive) => {
      const matchesProgram =
        !this.selectedProgram ||
        this.extractPrograms(drive).includes(this.selectedProgram);

      const haystack = [
        drive.company_name,
        drive.job_role,
        drive.description,
        drive.ctc,
        drive.eligible_batch,
        ...this.extractPrograms(drive)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);

      return matchesProgram && matchesSearch;
    });
  }

  get availablePrograms(): string[] {
    return Array.from(
      new Set(this.drives.flatMap((drive) => this.extractPrograms(drive)))
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
