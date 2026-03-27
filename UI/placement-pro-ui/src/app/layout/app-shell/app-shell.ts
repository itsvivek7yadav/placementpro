import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TpoSidebar } from '../sidebar/tpo-sidebar';
import { StudentSidebar } from '../sidebar/student-sidebar';
import { Topbar } from '../topbar/topbar';
import { LayoutStateService } from '../layout-state.service';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    CommonModule,
    Topbar,
    TpoSidebar,
    StudentSidebar
  ],
  template: `
    <!-- Fixed topbar sits outside the scroll area -->
    <app-topbar></app-topbar>

    <!-- Layout starts BELOW the topbar (60px offset) -->
    <div class="layout" [class.mobile-layout]="isMobile">
      <div class="sidebar-backdrop" *ngIf="isMobile && sidebarOpen" (click)="closeSidebar()"></div>

      <aside class="sidebar-panel" [class.mobile-open]="sidebarOpen" [class.mobile-sidebar]="isMobile">
        <app-tpo-sidebar     *ngIf="role === 'TPO'"></app-tpo-sidebar>
        <app-student-sidebar *ngIf="role === 'STUDENT'"></app-student-sidebar>
      </aside>

      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding-top: 60px;
    }

    .layout {
      display: flex;
      height: calc(100vh - 60px);
      overflow: hidden;
    }

    .sidebar-panel {
      flex-shrink: 0;
      position: relative;
      z-index: 1001;
    }

    .sidebar-backdrop {
      position: fixed;
      inset: 56px 0 0 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      z-index: 1000;
    }

    .content {
      flex: 1;
      background: #f0f2f5;
      overflow-y: auto;
      overflow-x: hidden;
      scroll-behavior: smooth;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
    }

    .content::-webkit-scrollbar {
      width: 5px;
    }
    .content::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 10px;
    }

    @media (max-width: 900px) {
      :host {
        padding-top: 56px;
      }

      .layout {
        height: calc(100vh - 56px);
      }

      .sidebar-panel {
        position: fixed;
        top: 56px;
        left: 0;
        bottom: 0;
        width: min(82vw, 280px);
        transform: translateX(-100%);
        transition: transform 0.24s ease;
      }

      .sidebar-panel.mobile-open {
        transform: translateX(0);
      }
    }
  `]
})
export class AppShell implements OnInit, OnDestroy {
  role: string | null = null;
  isMobile = false;
  sidebarOpen = false;
  private destroy$ = new Subject<void>();

  constructor(private layoutState: LayoutStateService) {
    const user = localStorage.getItem('user');
    this.role = user ? JSON.parse(user).role : null;
  }

  ngOnInit(): void {
    this.layoutState.syncViewport();

    this.layoutState.isMobile$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isMobile) => {
        this.isMobile = isMobile;
      });

    this.layoutState.sidebarOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isOpen) => {
        this.sidebarOpen = isOpen;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.layoutState.syncViewport();
  }

  closeSidebar(): void {
    this.layoutState.closeSidebar();
  }
}
