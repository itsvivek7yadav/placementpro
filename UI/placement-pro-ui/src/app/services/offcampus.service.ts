import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../auth/auth';

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  source_url: string;
  source: string;
  role_type: string;
  skills: string[];
  summary: string;
  application_tip: string;
  salary_range: string;
  job_type: string;
  experience_level: string;
  posted_at: string;
  expires_at: string;
  is_bookmarked?: boolean;
}

export interface IndustryEvent {
  id: number;
  title: string;
  organizer: string;
  location: string;
  event_url: string;
  source: string;
  description: string;
  summary: string;
  event_type: string;
  tags: string[];
  is_online: boolean;
  is_free: boolean;
  event_date: string;
  registration_deadline: string;
  is_bookmarked?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JobFilters {
  role_type?: string;
  location?: string;
  skills?: string;
  date_from?: string;
  date_to?: string;
  source?: string;
  page?: number;
  limit?: number;
}

export interface EventFilters {
  event_type?: string;
  is_online?: boolean;
  is_free?: boolean;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OffCampusService {

  private readonly base = 'http://localhost:5050/api/offcampus';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ─────────────────────────────────────────────
  // AUTH HEADER HELPER (🔥 CRITICAL FIX)
  // ─────────────────────────────────────────────

  hasStoredToken(): boolean {
    return !!this.authService.getToken();
  }

  private getAuthHeaders() {
    const headers = this.authService.getAuthHeaders();
    if (!headers.has('Authorization')) {
      return {};
    }
    return { headers };
  }

  // ─────────────────────────────────────────────
  // JOBS
  // ─────────────────────────────────────────────

  getJobs(filters: JobFilters = {}): Observable<PaginatedResult<Job>> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<{ success: boolean; data: any }>(`${this.base}/jobs`, { params })
      .pipe(
        map(res => ({
          items:      res.data.jobs       as Job[],
          total:      res.data.total      as number,
          page:       res.data.page       as number,
          limit:      res.data.limit      as number,
          totalPages: res.data.totalPages as number
        })),
        catchError(err => throwError(() => err))
      );
  }

  getJobById(id: number): Observable<Job> {
    return this.http
      .get<{ success: boolean; data: Job }>(`${this.base}/jobs/${id}`)
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => err))
      );
  }

  // ─────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────

  getEvents(filters: EventFilters = {}): Observable<PaginatedResult<IndustryEvent>> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<{ success: boolean; data: any }>(`${this.base}/events`, { params })
      .pipe(
        map(res => ({
          items:      res.data.events     as IndustryEvent[],
          total:      res.data.total      as number,
          page:       res.data.page       as number,
          limit:      res.data.limit      as number,
          totalPages: res.data.totalPages as number
        })),
        catchError(err => throwError(() => err))
      );
  }

  getEventById(id: number): Observable<IndustryEvent> {
    return this.http
      .get<{ success: boolean; data: IndustryEvent }>(`${this.base}/events/${id}`)
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => err))
      );
  }

  // ─────────────────────────────────────────────
  // BOOKMARKS (🔥 FIXED)
  // ─────────────────────────────────────────────

  toggleBookmark(
    opportunityId: number,
    opportunityType: 'job' | 'event'
  ): Observable<{ action: string }> {
    return this.http
      .post<{ success: boolean; data: { action: string } }>(
        `${this.base}/bookmark`,
        { opportunityId, opportunityType },
        this.getAuthHeaders()
      )
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => err))
      );
  }

  getBookmarks(): Observable<any[]> {
    return this.http
      .get<{ success: boolean; data: any[] }>(
        `${this.base}/bookmarks`,
        this.getAuthHeaders()
      )
      .pipe(
        map(res => res.data || []),
        catchError(err => throwError(() => err))
      );
  }

  // ─────────────────────────────────────────────
  // RECOMMENDATIONS
  // ─────────────────────────────────────────────

  getRecommendations(refresh = false): Observable<any[]> {
    let params = new HttpParams();

    if (refresh) {
      params = params.set('refresh', 'true');
    }

    return this.http
      .get<{ success: boolean; data: any[] }>(
        `${this.base}/recommend`,
        {
          params,
          ...this.getAuthHeaders()
        }
      )
      .pipe(
        map(res => res.data),
        catchError(err => throwError(() => err))
      );
  }
}
