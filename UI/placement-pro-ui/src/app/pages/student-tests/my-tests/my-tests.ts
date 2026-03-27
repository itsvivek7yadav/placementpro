import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-my-tests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-tests.html',
  styleUrls: ['./my-tests.scss']
})
export class MyTests implements OnInit {

  tests:   any[] = [];
  loading  = true;

  private API = 'http://localhost:5050/api/student-tests';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() { this.loadTests(); }

  loadTests() {
    this.http.get<any>(this.API).subscribe({
      next: res => {
        this.tests   = res.tests;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  startTest(testId: number) {
    this.router.navigate(['/tests/attempt', testId]);
  }

  isLive(test: any): boolean {
    const now = new Date();
    return test.status === 'LIVE' &&
           now >= new Date(test.start_time) &&
           now <= new Date(test.end_time);
  }

  getButtonLabel(test: any): string {
    if (test.attempt_status === 'SUBMITTED') return '✅ Submitted';
    if (!this.isLive(test))                  return '⏳ Not Started Yet';
    return '▶ Start Test';
  }
}
