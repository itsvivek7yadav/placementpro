import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { buildApiUrl } from '../../api.config';

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

  private readonly API = buildApiUrl();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDrives();
  }

  loadDrives() {
    this.loading = true;
    this.http.get<any>(`${this.API}/student-drives/eligible`).subscribe({
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
    this.router.navigate(['/drives', driveId], { queryParams: { apply: 'true' } });
  }

  getCompensationLabel(drive: any): string {
    if (drive.compensation_label) {
      return drive.compensation_label;
    }

    if (drive.job_type === 'FTE') {
      if (!drive.ctc_disclosed) return 'CTC not disclosed';
      if (drive.ctc_min != null && drive.ctc_max != null) return `${drive.ctc_min} - ${drive.ctc_max} LPA`;
      return drive.ctc_min != null ? `${drive.ctc_min} LPA` : 'CTC not disclosed';
    }

    if (drive.job_type === 'INTERNSHIP') {
      return drive.stipend_amount != null ? `Rs. ${drive.stipend_amount} / monthly` : 'Stipend not disclosed';
    }

    if (drive.job_type === 'INTERNSHIP_PPO') {
      const stipend = drive.stipend_amount != null ? `Rs. ${drive.stipend_amount} / monthly` : 'Stipend not disclosed';
      if (!drive.ppo_ctc_disclosed) return `${stipend} | PPO CTC not disclosed`;
      if (drive.ppo_ctc_min != null && drive.ppo_ctc_max != null) return `${stipend} | PPO ${drive.ppo_ctc_min} - ${drive.ppo_ctc_max} LPA`;
      return stipend;
    }

    return 'Not disclosed';
  }
}
