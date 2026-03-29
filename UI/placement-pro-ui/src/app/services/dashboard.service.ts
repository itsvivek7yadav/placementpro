import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
  private baseUrl = 'http://localhost:5050/api';

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
