import { Routes } from '@angular/router';
import { AppShell } from './layout/app-shell/app-shell';

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
      // ✅ Keep only this one
{
  path: 'placement-drives/edit/:id',
  loadComponent: () => 
    import('./pages/placement-drives/edit-drives/edit-drives')
    .then(m => m.EditDrive)
},

      // ✅ Drive applicants page
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
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/student-profile/student-profile')
            .then(m => m.StudentProfile),
      }

    ]
  }

];