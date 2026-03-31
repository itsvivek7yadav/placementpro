import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth';

export const authGuard: CanActivateFn = () => {
  return !!inject(AuthService).getToken();
};


