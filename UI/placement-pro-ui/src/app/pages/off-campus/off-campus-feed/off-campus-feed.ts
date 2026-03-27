import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

// ✅ IMPORT CHILD COMPONENTS
import { OffCampusJobsComponent } from '../off-campus-jobs/off-campus-jobs';
import { IndustryEventsComponent } from '../industry-events/industry-events';
import { SavedOpportunitiesComponent } from '../saved-opportunities/saved-opportunities';

// ✅ SERVICE
import { OffCampusService } from '../../../services/offcampus.service';

export type FeedTab = 'jobs' | 'events' | 'saved';

@Component({
  selector: 'app-off-campus-feed',
  standalone: true,

  // 🔥 THIS IS THE MAIN FIX
  imports: [
    CommonModule,
    MatIconModule,
    OffCampusJobsComponent,
    IndustryEventsComponent,
    SavedOpportunitiesComponent
  ],

  templateUrl: './off-campus-feed.html',
  styleUrl: './off-campus-feed.scss'
})
export class OffCampusFeedComponent implements OnInit {

  activeTab: FeedTab = 'jobs';
  savedCount = 0;

  constructor(private svc: OffCampusService) {}

  ngOnInit(): void {
    this.safeRefreshCount();
  }

  setTab(tab: FeedTab) {
    this.activeTab = tab;

    if (tab === 'saved') {
      this.safeRefreshCount();
    }
  }

  safeRefreshCount() {
    if (!this.svc.hasStoredToken()) {
      this.savedCount = 0;
      return;
    }

    this.svc.getBookmarks().subscribe({
      next: (items: any[]) => {
        this.savedCount = items.length;
      },
      error: () => {
        this.savedCount = 0;
      }
    });
  }

  onBookmarkChanged() {
    this.safeRefreshCount();
  }

  // ✅ FIX TYPE ERROR HERE
  onCountChanged(count: number) {
    this.savedCount = count;
  }
}
