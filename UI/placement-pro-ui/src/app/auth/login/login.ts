import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMessage: string | null = null;

  loginForm = this.fb.nonNullable.group({
    email: ['', Validators.required],   // supports Email or PRN
    password: ['', Validators.required]
  });

  login() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    const credentials = this.loginForm.getRawValue();

    this.authService.login(credentials).subscribe({
      next: (res: any) => {

        if (!res?.token) {
          this.errorMessage = 'Invalid credentials';
          this.loading = false;
          return;
        }

        this.authService.saveToken(res.token);
        this.authService.saveUser(res.user);

        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Login failed';
      }
    });
  }
}