// src/app/pages/off-campus/off-campus-jobs/off-campus-jobs.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import {
  OffCampusService,
  Job,
  JobFilters,
  PaginatedResult
} from '../../../services/offcampus.service';
import { OpportunityCardComponent } from '../../../components/opportunity-card/opportunity-card';

@Component({
  selector: 'app-off-campus-jobs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatTooltipModule,
    OpportunityCardComponent
  ],
  templateUrl: './off-campus-jobs.html',
  styleUrl: './off-campus-jobs.scss'
})
export class OffCampusJobsComponent implements OnInit, OnDestroy {

  jobs: Job[] = [];
  total = 0;
  totalPages = 0;
  currentPage = 1;
  pageSize = 9;
  isLoading = false;
  hasError = false;
  errorMessage = '';
  bookmarkLoadingIds = new Set<number>();

  filterForm: FormGroup;

  readonly roleTypeOptions = [
    { value: '',                 label: 'All Roles'        },
    { value: 'business analyst', label: 'Business Analyst' },
    { value: 'data analyst',     label: 'Data Analyst'     },
    { value: 'consultant',       label: 'Consultant'       },
    { value: 'fresher',          label: 'Fresher'          }
  ];

  readonly sourceOptions = [
    { value: '',         label: 'All Sources' },
    { value: 'adzuna',   label: 'Adzuna'      },
    { value: 'linkedin', label: 'LinkedIn'    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private offCampusService: OffCampusService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      role_type: [''],
      location:  [''],
      skills:    [''],
      source:    ['']
    });
  }

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadJobs();
      });

    this.loadJobs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadJobs(): void {
    this.isLoading = true;
    this.hasError  = false;

    const { role_type, location, skills, source } = this.filterForm.value;

    const filters: JobFilters = { page: this.currentPage, limit: this.pageSize };
    if (role_type) filters.role_type = role_type;
    if (location)  filters.location  = location.trim();
    if (skills)    filters.skills    = skills.trim();
    if (source)    filters.source    = source;

    this.offCampusService.getJobs(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PaginatedResult<Job>) => {
          this.jobs       = result.items;
          this.total      = result.total;
          this.totalPages = result.totalPages;
          this.isLoading  = false;
        },
        error: (_err: unknown) => {
          this.hasError     = true;
          this.errorMessage = 'Failed to load jobs. Please try again.';
          this.isLoading    = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize    = event.pageSize;
    this.loadJobs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onBookmarkToggle(event: { id: number; type: 'job' | 'event' }): void {
    this.bookmarkLoadingIds.add(event.id);

    this.offCampusService.toggleBookmark(event.id, 'job')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: { action: string }) => {
          this.bookmarkLoadingIds.delete(event.id);
          const job = this.jobs.find(j => j.id === event.id);
          if (job) job.is_bookmarked = result.action === 'bookmarked';
          const msg = result.action === 'bookmarked' ? 'Job saved!' : 'Bookmark removed';
          this.snackBar.open(msg, 'Close', { duration: 2500, panelClass: 'snack-success' });
        },
        error: (_err: unknown) => {
          this.bookmarkLoadingIds.delete(event.id);
          this.snackBar.open('Could not update bookmark. Please log in.', 'Close', {
            duration: 3000,
            panelClass: 'snack-error'
          });
        }
      });
  }

  onViewDetail(_event: { id: number; type: 'job' | 'event' }): void {
    // this.router.navigate(['/off-campus/jobs', event.id]);
  }

  clearFilters(): void {
    this.filterForm.reset({ role_type: '', location: '', skills: '', source: '' });
    this.currentPage = 1;
    this.loadJobs();
  }

  get hasActiveFilters(): boolean {
    const v = this.filterForm.value;
    return !!(v.role_type || v.location || v.skills || v.source);
  }

  isBookmarkLoading(id: number): boolean {
    return this.bookmarkLoadingIds.has(id);
  }

  trackById(_index: number, item: Job): number {
    return item.id;
  }
}
