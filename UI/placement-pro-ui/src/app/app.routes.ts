import { Routes } from '@angular/router';
import { AppShell } from './layout/app-shell/app-shell';
import { ResumeBuilderComponent } from './features/resume-builder/resume-builder';
import { BulkEmail } from './features/tpo/bulk-email/bulk-email';

export const routes: Routes = [

  // 🔐 Login (no layout)
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login').then(m => m.Login)
  },

  // 🏠 Protected area WITH sidebar layout
  {
    path: '',
    component: AppShell,
    children: [

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard')
            .then(m => m.Dashboard)
      },

      {
        path: 'student-onboarding',
        loadComponent: () =>
          import('./pages/student-onboarding/student-onboarding')
            .then(m => m.StudentOnboarding)
      },

      {
        path: 'placement-drives/create-drive',
        loadComponent: () =>
          import('./pages/placement-drives/create-drive/create-drive')
            .then(m => m.CreateDrive)
      },

      {
        path: 'placement-drives/open-drives',
        loadComponent: () =>
          import('./pages/placement-drives/open-drives/open-drives')
            .then(m => m.OpenDrives)
      },

      {
        path: 'placement-drives/closed-drives',
        loadComponent: () =>
          import('./pages/placement-drives/closed-drives/closed-drives')
            .then(m => m.ClosedDrives)
      },

      {
        path: 'placement-drives/edit/:id',
        loadComponent: () =>
          import('./pages/placement-drives/edit-drives/edit-drives')
            .then(m => m.EditDrive)
      },

      {
        path: 'placement-drives/applicants/:drive_id',
        loadComponent: () =>
          import('./pages/placement-drives/drive-applicants/drive-applicants')
            .then(m => m.DriveApplicants)
      },

      {
        path: 'students',
        loadComponent: () =>
          import('./pages/students/students')
            .then(m => m.Students)
      },

      {
        path: 'reports/placement-dashboard',
        loadComponent: () =>
          import('./pages/reports/placement-report-dashboard/placement-report-dashboard')
            .then(m => m.PlacementReportDashboard)
      },

      {
        path: 'drives',
        loadComponent: () =>
          import('./pages/eligible-drives/eligible-drives')
            .then(m => m.EligibleDrives)
      },

      {
        path: 'drives/:id',
        loadComponent: () =>
          import('./pages/drive-detail/drive-detail')
            .then(m => m.DriveDetail)
      },

      {
        path: 'applications',
        loadComponent: () =>
          import('./pages/my-applications/my-applications')
            .then(m => m.MyApplications)
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/notifications')
            .then(m => m.NotificationsPage)
      },
      {
        path: 'my-progress',
        loadComponent: () =>
          import('./pages/placement-progress/placement-progress')
            .then(m => m.PlacementProgress)
      },

      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/student-profile/student-profile')
            .then(m => m.StudentProfile),
      },
      {
        path: 'students/:studentId/progress',
        loadComponent: () =>
          import('./pages/placement-progress/placement-progress')
            .then(m => m.PlacementProgress)
      },

      // TPO
      {
        path: 'mock-tests',
        loadComponent: () =>
          import('./pages/mock-tests/test-list/test-list').then(m => m.TestList)
      },
      {
        path: 'mock-tests/create',
        loadComponent: () =>
          import('./pages/mock-tests/create-test/create-test').then(m => m.CreateTest)
      },
      {
        path: 'mock-tests/results/:test_id',
        loadComponent: () =>
          import('./pages/mock-tests/test-results/test-results').then(m => m.TestResults)
      },

      // Student Tests
      {
        path: 'tests',
        loadComponent: () =>
          import('./pages/student-tests/my-tests/my-tests').then(m => m.MyTests)
      },
      {
        path: 'tests/attempt/:test_id',
        loadComponent: () =>
          import('./pages/student-tests/test-attempt/test-attempt').then(m => m.TestAttempt)
      },
      {
        path: 'tests/score',
        loadComponent: () =>
          import('./pages/student-tests/test-score/test-score').then(m => m.TestScore)
      },

      // Resume Builder
      {
        path: 'resume-builder',
        component: ResumeBuilderComponent
      },

      // TPO Bulk Email
      {
        path: 'tpo/bulk-email',
        component: BulkEmail
      },

      // ── Off Campus Intelligence Feed (lazy loaded module) ──
      {
        path: 'off-campus',
        loadChildren: () =>
          import('./pages/off-campus/off-campus.module')
            .then(m => m.OffCampusModule)
      },

      // Default redirect
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }

    ]
  }

];
