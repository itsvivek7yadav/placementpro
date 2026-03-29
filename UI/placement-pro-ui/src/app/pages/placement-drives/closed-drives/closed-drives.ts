import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { buildApiUrl } from '../../../api.config';

@Component({
  selector: 'app-closed-drives',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './closed-drives.html',
  styleUrls: ['./closed-drives.scss']
})
export class ClosedDrives implements OnInit {

  drives: any[] = [];
  loading = true;

private readonly baseUrl = buildApiUrl('placement-drives');

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() { this.loadDrives(); }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
  }

  loadDrives() {
    this.loading = true;
    this.http.get<{ drives: any[] }>(`${this.baseUrl}/closed`, { headers: this.headers() })
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

}
