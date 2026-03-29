import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { buildApiUrl } from '../api.config';

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

  constructor(private http: HttpClient) {}

  /**
   * Finds the JWT token by checking every common key name,
   * and also looks inside stored user/auth objects.
   * 
   * TO DEBUG: open browser console while logged in and run:
   *   Object.keys(localStorage).forEach(k => console.log(k, localStorage.getItem(k)));
   * Then update TOKEN_KEYS below with your actual key name.
   */
  private getToken(): string | null {
    // ── 1. Check flat string keys (most common) ──────────────────────────
    const TOKEN_KEYS = [
      'authToken',
      'token',
      'jwtToken',
      'jwt',
      'access_token',
      'accessToken',
      'id_token',
      'bearerToken',
      'auth_token',
    ];

    for (const key of TOKEN_KEYS) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val && val.length > 20) return val;  // basic sanity check
    }

    // ── 2. Check inside stored user/auth objects ─────────────────────────
    const OBJECT_KEYS = ['user', 'auth', 'currentUser', 'userData', 'session'];

    for (const key of OBJECT_KEYS) {
      try {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (!raw) continue;
        const obj = JSON.parse(raw);
        const token =
          obj?.token     ||
          obj?.authToken ||
          obj?.jwtToken  ||
          obj?.jwt       ||
          obj?.access_token ||
          obj?.accessToken;
        if (token && token.length > 20) return token;
      } catch {
        // not valid JSON, skip
      }
    }

    // ── 3. Nothing found — log all keys to help diagnose ─────────────────
    console.warn(
      '[ResumeService] No auth token found. localStorage keys present:',
      Object.keys(localStorage)
    );
    return null;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();

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
