import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../auth/auth';

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

  newCvFile: File | null = null;

  private API = 'http://localhost:5050/api/student-profile';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  get fullName(): string {
    const parts = [this.profile.first_name, this.profile.middle_name, this.profile.last_name];
    const name  = parts.filter(Boolean).join(' ');
    return name || this.profile.name || 'Student';
  }

  get initials(): string {
    const f = this.profile.first_name?.charAt(0) || '';
    const l = this.profile.last_name?.charAt(0)  || '';
    return (f + l).toUpperCase() || 'S';
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
    this.newCvFile = null;
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

    // Append CV file if selected
    if (this.newCvFile) {
      formData.append('cv', this.newCvFile);
    } else if (this.profile.cv_link) {
      formData.append('cv_link', this.profile.cv_link);
    }

    this.http.put<any>(this.API, formData, {
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.successMessage = 'Profile updated successfully!';
        this.saving   = false;
        this.editMode = false;
        this.newCvFile = null;
        this.loadProfile(); // reload fresh data
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to save profile';
        this.saving = false;
      }
    });
  }

  onCvSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.newCvFile = input.files[0];
    }
  }

  onCvDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.newCvFile = file;
  }
}
