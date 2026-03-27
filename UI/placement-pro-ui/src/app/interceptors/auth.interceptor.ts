import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { IS_LOCAL_FRONTEND, isApiRequestUrl } from '../api.config';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const token = localStorage.getItem('token');
    const isApiRequest = isApiRequestUrl(req.url);
    const isLoginRequest = req.url.endsWith('/api/auth/login') || req.url.endsWith('/auth/login');

    if (token) {
      if (isApiRequest && IS_LOCAL_FRONTEND) {
        console.log('[AuthInterceptor] Attaching token', {
          url: req.url,
          hasToken: true,
          tokenPreview: `${token.slice(0, 12)}...`
        });
      }

      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      return next.handle(cloned);
    }

    if (isApiRequest && !isLoginRequest && IS_LOCAL_FRONTEND) {
      console.warn('[AuthInterceptor] No token found for API request', {
        url: req.url,
        localStorageKeys: Object.keys(localStorage)
      });
    }

    return next.handle(req);
  }
}
