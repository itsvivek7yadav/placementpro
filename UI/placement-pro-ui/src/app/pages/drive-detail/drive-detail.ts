import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-drive-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drive-detail.html',
  styleUrls: ['./drive-detail.scss']
})
export class DriveDetail implements OnInit {

  drive: any = null;
  loading = true;
  applying = false;
  errorMessage = '';

  // 🔥 Change this later to production backend URL
  private API = 'http://localhost:5050/api';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadDrive(+id);
  }

  loadDrive(id: number): void {
    this.http.get<any>(`${this.API}/student/drives/${id}`).subscribe({
      next: (res) => {
        this.drive = res.drive;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage = 'Failed to load drive details';
      }
    });
  }

  apply(): void {
    if (!this.drive) return;
    this.applyNow(this.drive.drive_id);
  }

  applyNow(driveId: number): void {

    if (!confirm('Apply for this drive?')) return;

  

this.applying = true;
this.errorMessage = '';

this.http.post<any>(`${this.API}/student/applications/apply`, { drive_id: driveId })
      .subscribe({
        next: (res) => {
          this.drive.my_application_id = res.application_id;
          this.applying = false;
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = err?.error?.message || 'Failed to apply';
          this.applying = false;
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/drives']);
  }
}