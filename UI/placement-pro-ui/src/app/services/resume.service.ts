import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { buildApiUrl } from '../api.config';
import { AuthService } from '../auth/auth';

export interface ResumeData {
  personalSummary: string;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    currentlyWorking: boolean;
    description: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
  };
  projects: Array<{
    title: string;
    description: string;
    technologies: string;
    link: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: string;
  }>;
  languages: Array<{
    language: string;
    proficiency: string;
  }>;
  achievements: Array<{
    title: string;
    description: string;
  }>;
}

export interface StudentData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country?: string;
  collegeName: string;
  degree: string;
  branch: string;
  cgpa: number;
  graduationYear: number;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  private readonly apiUrl = buildApiUrl('resume');

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  getStudentData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/student-data`, {
      headers: this.getAuthHeaders()
    });
  }

  getStudentResumes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/list`, {
      headers: this.getAuthHeaders()
    });
  }

  getResume(resumeId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${resumeId}`, {
      headers: this.getAuthHeaders()
    });
  }

  saveResume(resumeData: ResumeData, resumeType: 'primary' | 'custom', template: string = 'modern'): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/save`,
      { resumeType, data: resumeData, template },
      { headers: this.getAuthHeaders() }
    );
  }

  downloadPDF(resumeId: number): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/generate-pdf`,
      { resumeId },
      { headers: this.getAuthHeaders(), responseType: 'blob' }
    );
  }

  deleteResume(resumeId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${resumeId}`, {
      headers: this.getAuthHeaders()
    });
  }
}
