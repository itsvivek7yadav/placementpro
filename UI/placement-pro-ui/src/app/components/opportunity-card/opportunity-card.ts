// src/app/components/opportunity-card/opportunity-card.ts

import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Job } from '../../services/offcampus.service';

@Component({
  selector: 'app-opportunity-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './opportunity-card.html',
  styleUrl: './opportunity-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OpportunityCardComponent {
  @Input() item!: Job;
  @Input() type: 'job' = 'job';
  @Input() bookmarkLoading = false;

  @Output() bookmarkToggled = new EventEmitter<{ id: number; type: 'job' }>();
  @Output() viewDetail      = new EventEmitter<{ id: number; type: 'job' }>();

  get job(): Job { return this.item; }

  get displayTitle(): string { return this.item.title; }

  get displaySubtitle(): string {
    return this.job.company;
  }

  get displayLocation(): string { return this.item.location || 'Remote / Online'; }

  get displaySummary(): string {
    return this.job.summary || '';
  }

  get displaySkills(): string[] {
    return this.job.skills || [];
  }

  get displayLink(): string {
    return this.job.source_url;
  }

  get displayDate(): string {
    const raw = this.job.posted_at;
    if (!raw) return '';
    return new Date(raw).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  get isBookmarked(): boolean { return !!(this.item as any).is_bookmarked; }

  get badgeLabel(): string {
    return this.job.role_type || this.job.experience_level || 'Job';
  }

  get badgeColor(): string {
    const roleColors: Record<string, string> = {
      'business analyst': 'primary',
      'data analyst':     'accent',
      'consultant':       'warn',
      'fresher':          'default'
    };
    return roleColors[this.job.role_type?.toLowerCase() ?? ''] || 'default';
  }

  onApplyClick(e: MouseEvent): void {
    e.stopPropagation();
    window.open(this.displayLink, '_blank', 'noopener,noreferrer');
  }

  onBookmarkClick(e: MouseEvent): void {
    e.stopPropagation();
    this.bookmarkToggled.emit({ id: this.item.id, type: this.type });
  }

  onCardClick(): void {
    this.viewDetail.emit({ id: this.item.id, type: this.type });
  }
}
