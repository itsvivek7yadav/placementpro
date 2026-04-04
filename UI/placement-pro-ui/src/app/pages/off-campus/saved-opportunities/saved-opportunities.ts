import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OffCampusService } from '../../../services/offcampus.service';

@Component({
  selector: 'app-saved-opportunities',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './saved-opportunities.html',
  styleUrl: './saved-opportunities.scss'
})
export class SavedOpportunitiesComponent implements OnInit, OnDestroy {

  @Output() countChanged = new EventEmitter<number>();

  items: any[] = [];

  // ✅ MATCH HTML
  isLoading = true;
  hasError = false;
  filter: 'all' | 'job' = 'all';

  bookmarkLoadingIds = new Set<number>();

  private destroy$ = new Subject<void>();
  constructor(private offCampusService: OffCampusService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    if (!this.offCampusService.hasStoredToken()) {
      this.items = [];
      this.isLoading = false;
      this.hasError = false;
      this.countChanged.emit(0);
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    this.offCampusService.getBookmarks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          this.items = data || [];
          this.isLoading = false;
          this.countChanged.emit(this.items.length);
        },
        error: () => {
          this.hasError = true;
          this.isLoading = false;
        }
      });
  }

  // ✅ REQUIRED BY HTML
  get filtered(): any[] {
    if (this.filter === 'all') return this.items;
    return this.items.filter(i => i.opportunity_type === this.filter);
  }

  get jobCount(): number {
    return this.items.filter(i => i.opportunity_type === 'job').length;
  }

  setFilter(f: 'all' | 'job') {
    this.filter = f;
  }

  // ✅ REQUIRED
  onBookmarkToggle(e: { id: number; type: 'job' }) {
    this.bookmarkLoadingIds.add(e.id);

    this.offCampusService.toggleBookmark(e.id, e.type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.bookmarkLoadingIds.delete(e.id);
          this.items = this.items.filter(i => i.id !== e.id);
          this.countChanged.emit(this.items.length);
        },
        error: () => {
          this.bookmarkLoadingIds.delete(e.id);
        }
      });
  }

  isLoading2(id: number): boolean {
    return this.bookmarkLoadingIds.has(id);
  }

  trackById(_: number, item: any): number {
    return item.id;
  }

  onViewDetail(item: any) {
    const url = item.source_url || item.event_url;
    if (url) {
      window.open(url, '_blank');
    }
  }
}
