// src/app/pages/off-campus/opportunity-detail/opportunity-detail.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OffCampusService, Job } from '../../../services/offcampus.service';

@Component({
  selector: 'app-opportunity-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './opportunity-detail.html',
  styleUrl: './opportunity-detail.scss'
})
export class OpportunityDetailComponent implements OnInit, OnDestroy {

  opportunity: Job | null = null;
  isLoading = true;
  hasError = false;
  bookmarkLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private offCampusService: OffCampusService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id  = Number(params['id']);
        this.loadOpportunity(id);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOpportunity(id: number): void {
    this.isLoading = true;
    this.hasError  = false;

    // typed as Observable<any> to avoid union type mismatch between Job and IndustryEvent
    const request$: Observable<any> = this.offCampusService.getJobById(id);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Job) => {
          this.opportunity = data;
          this.isLoading   = false;
        },
        error: (_err: unknown) => {
          this.hasError  = true;
          this.isLoading = false;
        }
      });
  }

  get job(): Job { return this.opportunity as Job; }
  get isBookmarked(): boolean { return !!(this.opportunity as any)?.is_bookmarked; }

  get applyUrl(): string {
    if (!this.opportunity) return '';
    return this.job.source_url;
  }

  onApply(): void {
    if (this.applyUrl) window.open(this.applyUrl, '_blank', 'noopener,noreferrer');
  }

  onBookmarkToggle(): void {
    if (!this.opportunity) return;
    this.bookmarkLoading = true;

    this.offCampusService.toggleBookmark(this.opportunity.id, 'job')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: { action: string }) => {
          this.bookmarkLoading = false;
          (this.opportunity as any).is_bookmarked = result.action === 'bookmarked';
          const msg = result.action === 'bookmarked' ? 'Saved!' : 'Bookmark removed';
          this.snackBar.open(msg, 'Close', { duration: 2500 });
        },
        error: (_err: unknown) => {
          this.bookmarkLoading = false;
          this.snackBar.open('Please log in to bookmark.', 'Close', { duration: 3000 });
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/off-campus']);
  }
}
