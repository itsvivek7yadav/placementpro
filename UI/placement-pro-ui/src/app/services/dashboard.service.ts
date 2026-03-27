import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';

/* =========================
   INTERFACES
========================= */

export interface TpoDashboardStats {
  totalStudents: number;
  totalPlaced: number;
  totalDrives: number;
  activeDrives: number;
  totalApplications: number;
}

export interface StudentDashboardStats {
  applications: number;
  placementStatus: string;
}

/* =========================
   SERVICE
========================= */

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = API_BASE_URL;

  constructor(private http: HttpClient) {}

  // 🔹 TPO Dashboard
  getTpoStats() {
    return this.http.get<TpoDashboardStats>(
      `${this.baseUrl}/tpo/dashboard/stats`
    );
  }

  // 🔹 Student Dashboard
  getStudentSummary() {
    return this.http.get<StudentDashboardStats>(
      `${this.baseUrl}/student/dashboard-summary`
    );
  }
}
