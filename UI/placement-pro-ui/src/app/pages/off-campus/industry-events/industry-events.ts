// src/app/pages/off-campus/industry-events/industry-events.ts

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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import {
  OffCampusService,
  IndustryEvent,
  EventFilters,
  PaginatedResult
} from '../../../services/offcampus.service';
import { OpportunityCardComponent } from '../../../components/opportunity-card/opportunity-card';

@Component({
  selector: 'app-industry-events',
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
    MatSlideToggleModule,
    OpportunityCardComponent
  ],
  templateUrl: './industry-events.html',
  styleUrl: './industry-events.scss'
})
export class IndustryEventsComponent implements OnInit, OnDestroy {

  events: IndustryEvent[] = [];
  total = 0;
  totalPages = 0;
  currentPage = 1;
  pageSize = 9;
  isLoading = false;
  hasError = false;
  errorMessage = '';
  bookmarkLoadingIds = new Set<number>();

  filterForm: FormGroup;

  readonly eventTypeOptions = [
    { value: '',           label: 'All Types'  },
    { value: 'webinar',    label: 'Webinar'    },
    { value: 'workshop',   label: 'Workshop'   },
    { value: 'conference', label: 'Conference' },
    { value: 'networking', label: 'Networking' },
    { value: 'hackathon',  label: 'Hackathon'  },
    { value: 'bootcamp',   label: 'Bootcamp'   },
    { value: 'seminar',    label: 'Seminar'    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private offCampusService: OffCampusService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      event_type: [''],
      is_online:  [false],
      is_free:    [false]
    });
  }

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadEvents();
      });

    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.hasError  = false;

    const { event_type, is_online, is_free } = this.filterForm.value;

    const filters: EventFilters = { page: this.currentPage, limit: this.pageSize };
    if (event_type) filters.event_type = event_type;
    if (is_online)  filters.is_online  = true;
    if (is_free)    filters.is_free    = true;

    this.offCampusService.getEvents(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PaginatedResult<IndustryEvent>) => {
          this.events     = result.items;
          this.total      = result.total;
          this.totalPages = result.totalPages;
          this.isLoading  = false;
        },
        error: (_err: unknown) => {
          this.hasError     = true;
          this.errorMessage = 'Failed to load events. Please try again.';
          this.isLoading    = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize    = event.pageSize;
    this.loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onBookmarkToggle(event: { id: number; type: 'job' | 'event' }): void {
    this.bookmarkLoadingIds.add(event.id);

    this.offCampusService.toggleBookmark(event.id, 'event')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: { action: string }) => {
          this.bookmarkLoadingIds.delete(event.id);
          const evt = this.events.find(e => e.id === event.id);
          if (evt) evt.is_bookmarked = result.action === 'bookmarked';
          const msg = result.action === 'bookmarked' ? 'Event saved!' : 'Bookmark removed';
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
    // this.router.navigate(['/off-campus/events', event.id]);
  }

  clearFilters(): void {
    this.filterForm.reset({ event_type: '', is_online: false, is_free: false });
    this.currentPage = 1;
    this.loadEvents();
  }

  get hasActiveFilters(): boolean {
    const v = this.filterForm.value;
    return !!(v.event_type || v.is_online || v.is_free);
  }

  isBookmarkLoading(id: number): boolean {
    return this.bookmarkLoadingIds.has(id);
  }

  trackById(_index: number, item: IndustryEvent): number {
    return item.id;
  }
}