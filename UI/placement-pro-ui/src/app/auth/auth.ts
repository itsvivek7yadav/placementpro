import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { buildApiUrl } from '../api.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private API = buildApiUrl('/auth');

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: string }) {
    return this.http.post<any>(`${this.API}/login`, credentials);
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    const tokenKeys = [
      'token',
      'authToken',
      'jwtToken',
      'jwt',
      'access_token',
      'accessToken',
      'id_token',
      'bearerToken',
      'auth_token'
    ];

    for (const key of tokenKeys) {
      const value = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (value && value.length > 20) {
        return value;
      }
    }

    const objectKeys = ['user', 'auth', 'currentUser', 'userData', 'session'];

    for (const key of objectKeys) {
      try {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (!raw) continue;

        const parsed = JSON.parse(raw);
        const token =
          parsed?.token ||
          parsed?.authToken ||
          parsed?.jwtToken ||
          parsed?.jwt ||
          parsed?.access_token ||
          parsed?.accessToken;

        if (token && token.length > 20) {
          return token;
        }
      } catch {
        // Ignore malformed entries.
      }
    }

    return null;
  }

  getAuthHeaders(contentType?: string): HttpHeaders {
    let headers = new HttpHeaders();
    const token = this.getToken();

    if (contentType) {
      headers = headers.set('Content-Type', contentType);
    }

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  getRole(): string | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).role : null;
  }

  saveUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  logout() {
    localStorage.clear();
  }
}
