import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../auth/auth';
import { buildApiUrl, buildBackendUrl } from '../../api.config';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-profile.html',
  styleUrls: ['./student-profile.scss']
})
export class StudentProfile implements OnInit {

  profile: any = {};
  form: any    = {};

  editMode      = false;
  loading       = true;
  saving        = false;
  successMessage = '';
  errorMessage   = '';
  resumeSlots: Array<{ slot: number; name: string; path: string }> = [];
  resumeUploads: Record<number, File | null> = { 1: null, 2: null };
  resumeLoading = false;
  resumeSavingSlot: number | null = null;

  private readonly API = buildApiUrl('student-profile');

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProfile();
    this.loadResumeSlots();
  }

  get fullName(): string {
    const parts = [this.profile.first_name, this.profile.middle_name, this.profile.last_name];
    const name  = parts.filter(Boolean).join(' ');
    return name || this.profile.name || 'Student';
  }

  getCvUrl(path: string): string {
    return buildBackendUrl(path);
  }

  getResumeForSlot(slot: number): { slot: number; name: string; path: string } | undefined {
    return this.resumeSlots.find((resume) => resume.slot === slot);
  }

  loadProfile() {
    this.loading = true;
    this.http.get<any>(this.API, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.profile = res.profile;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadResumeSlots() {
    this.resumeLoading = true;
    this.http.get<any>(`${this.API}/resumes`, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.resumeSlots = res.resumes || [];
        this.resumeLoading = false;
      },
      error: () => {
        this.resumeLoading = false;
      }
    });
  }

  enableEdit() {
    // Deep copy profile into form so cancel works cleanly
    this.form = {
      first_name:           this.profile.first_name       || '',
      middle_name:          this.profile.middle_name      || '',
      last_name:            this.profile.last_name        || '',
      personal_email:       this.profile.personal_email   || '',
      date_of_birth:        this.profile.date_of_birth
                              ? this.profile.date_of_birth.substring(0, 10)
                              : '',
      gender:               this.profile.gender           || '',
      phone_number:         this.profile.phone_number     || '',
      whatsapp_number:      this.profile.whatsapp_number  || '',
      whatsapp_link:        this.profile.whatsapp_link    || '',
      linkedin_profile_url: this.profile.linkedin_profile_url || '',
      city:                 this.profile.city             || '',
      state:                this.profile.state            || '',
      country:              this.profile.country          || '',
      std_x_percentage:     this.profile.std_x_percentage  || '',
      std_x_cgpa:           this.profile.std_x_cgpa        || '',
      std_xii_percentage:   this.profile.std_xii_percentage || '',
      std_xii_cgpa:         this.profile.std_xii_cgpa      || '',
      ug_course_name:       this.profile.ug_course_name    || '',
      ug_specialization:    this.profile.ug_specialization || '',
      ug_university:        this.profile.ug_university     || '',
      ug_percentage:        this.profile.ug_percentage     || '',
      ug_cgpa:              this.profile.ug_cgpa           || '',
      ug_year:              this.profile.ug_year           || '',
      educational_background: this.profile.educational_background || '',
      sem1_gpa:             this.profile.sem1_gpa          || '',
      sem2_gpa:             this.profile.sem2_gpa          || '',
      sem3_gpa:             this.profile.sem3_gpa          || '',
      cgpa:                 this.profile.cgpa              || '',
      interested_job_roles: this.profile.interested_job_roles || '',
      work_experience:      this.profile.work_experience   ?? 0,
      total_work_experience: this.profile.total_work_experience || '',
      last_company_name:    this.profile.last_company_name    || '',
      last_company_industry: this.profile.last_company_industry || '',
    };
    this.editMode = true;
    this.successMessage = '';
    this.errorMessage   = '';
  }

  cancelEdit() {
    this.editMode  = false;
    this.form      = {};
    this.errorMessage = '';
  }

  saveProfile() {
    this.saving = true;
    this.errorMessage   = '';
    this.successMessage = '';

    const formData = new FormData();

    // Append all text fields
    Object.keys(this.form).forEach(key => {
      formData.append(key, this.form[key] ?? '');
    });

    this.http.put<any>(this.API, formData, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.successMessage = 'Profile updated successfully!';
        this.saving   = false;
        this.editMode = false;
        this.loadProfile(); // reload fresh data
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to save profile';
        this.saving = false;
      }
    });
  }

  onCvSelect(slot: number, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.resumeUploads[slot] = input.files[0];
    }
  }

  onCvDrop(slot: number, event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.resumeUploads[slot] = file;
  }

  uploadResume(slot: number) {
    const file = this.resumeUploads[slot];
    if (!file) {
      return;
    }

    this.resumeSavingSlot = slot;
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('resume', file);

    this.http.post<any>(`${this.API}/resumes/${slot}`, formData, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: () => {
        this.resumeUploads[slot] = null;
        this.resumeSavingSlot = null;
        this.successMessage = `Resume uploaded to slot ${slot}`;
        this.loadProfile();
        this.loadResumeSlots();
      },
      error: (err) => {
        this.resumeSavingSlot = null;
        this.errorMessage = err?.error?.message || 'Failed to upload resume';
      }
    });
  }

  deleteResume(slot: number) {
    if (!confirm(`Remove resume from slot ${slot}?`)) {
      return;
    }

    this.resumeSavingSlot = slot;
    this.http.delete<any>(`${this.API}/resumes/${slot}`, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: () => {
        this.resumeUploads[slot] = null;
        this.resumeSavingSlot = null;
        this.successMessage = `Resume removed from slot ${slot}`;
        this.loadProfile();
        this.loadResumeSlots();
      },
      error: (err) => {
        this.resumeSavingSlot = null;
        this.errorMessage = err?.error?.message || 'Failed to delete resume';
      }
    });
  }
}
