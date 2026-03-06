import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { TpoSidebar } from '../sidebar/tpo-sidebar';
import { StudentSidebar } from '../sidebar/student-sidebar';
import { Topbar } from '../topbar/topbar';

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
    <div class="layout">
      <app-tpo-sidebar     *ngIf="role === 'TPO'"></app-tpo-sidebar>
      <app-student-sidebar *ngIf="role === 'STUDENT'"></app-student-sidebar>

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
  `]
})
export class AppShell {
  role: string | null = null;

  constructor() {
    const user = localStorage.getItem('user');
    this.role = user ? JSON.parse(user).role : null;
  }
}