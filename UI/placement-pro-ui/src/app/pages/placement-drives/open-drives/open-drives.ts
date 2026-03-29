import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-open-drives',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './open-drives.html',
  styleUrls: ['./open-drives.scss']
})
export class OpenDrives implements OnInit {

  drives: any[] = [];
  loading    = true;
  closingId: number | null = null;

  private baseUrl = 'http://localhost:5050/api/placement-drives'

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() { this.loadDrives(); }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
  }

  loadDrives() {
    this.loading = true;
    this.http.get<{ drives: any[] }>(`${this.baseUrl}/open`, { headers: this.headers() })
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
    this.http.put(`${this.baseUrl}/${id}/close`, {}, { headers: this.headers() })
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

}
