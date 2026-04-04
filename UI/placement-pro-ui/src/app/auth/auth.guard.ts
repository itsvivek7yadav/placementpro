import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './auth';

export const authGuard: CanActivateFn = () => {
  return !!inject(AuthService).getToken();
};

export const studentOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getToken()) {
    return router.parseUrl('/login');
  }

  if (authService.getRole() !== 'STUDENT') {
    return router.parseUrl('/dashboard');
  }

  return true;
};

