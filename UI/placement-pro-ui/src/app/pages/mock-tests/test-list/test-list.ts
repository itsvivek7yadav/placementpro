import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { buildApiUrl } from '../../../api.config';

@Component({
  selector: 'app-test-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-list.html',
  styleUrls: ['./test-list.scss']
})
export class TestList implements OnInit {

  tests:   any[] = [];
  loading  = true;
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';

  private readonly apiUrl = buildApiUrl('mock-tests');

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() { this.loadTests(); }

  loadTests() {
    this.loading = true;
    this.http.get<any>(this.apiUrl).subscribe({
      next: res => {
        this.tests   = res.tests;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  createTest() { this.router.navigate(['/mock-tests/create']); }

  viewResults(testId: number) {
    this.router.navigate(['/mock-tests/results', testId]);
  }

  closeTest(testId: number) {
    if (!confirm('Close this test? Students will no longer be able to attempt it.')) return;

    this.http.put(`${this.apiUrl}/${testId}/close`, {}).subscribe({
      next: () => {
        this.showToast('Test closed', 'success');
        this.loadTests();
      },
      error: () => this.showToast('Failed to close test', 'error')
    });
  }

  deleteTest(testId: number) {
    if (!confirm('Delete this draft test? This cannot be undone.')) return;

    this.http.delete(`${this.apiUrl}/${testId}`).subscribe({
      next: () => {
        this.showToast('Test deleted', 'success');
        this.loadTests();
      },
      error: () => this.showToast('Failed to delete', 'error')
    });
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMsg  = msg;
    this.toastType = type;
    setTimeout(() => this.toastMsg = '', 3000);
  }

  getStatusClass(status: string) {
    return {
      'badge-draft':   status === 'DRAFT',
      'badge-live':    status === 'LIVE',
      'badge-closed':  status === 'CLOSED'
    };
  }
}
