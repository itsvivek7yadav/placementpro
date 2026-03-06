import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-eligible-drives',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './eligible-drives.html',
  styleUrls: ['./eligible-drives.scss']
})
export class EligibleDrives implements OnInit {

  drives: any[] = [];
  loading = true;

  private API = 'http://localhost:5050/api';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadDrives();
  }

  loadDrives() {
    this.loading = true;
    this.http.get<any>(`${this.API}/drives/eligible`).subscribe({
      next: (res) => {
        this.drives = res.drives;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  viewDrive(driveId: number) {
    this.router.navigate(['/drives', driveId]);
  }

applyNow(driveId: number) {

  if (!confirm('Apply for this drive?')) return;

  const token = localStorage.getItem('token') || '';

  const payload = {
    drive_id: driveId
  };

  this.http.post(
    'http://localhost:5050/api/student/applications/apply',
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )
  .subscribe({
    next: () => {
      alert('Application submitted successfully 🎉');
    },

    error: err => {
      console.error('Application failed', err);
      alert(err.error?.message || 'Failed to apply');
    }
  });
}




}