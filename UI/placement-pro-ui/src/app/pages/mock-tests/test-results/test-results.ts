import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { buildApiUrl } from '../../../api.config';

@Component({
  selector: 'app-test-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-results.html',
  styleUrls: ['./test-results.scss']
})
export class TestResults implements OnInit {

  results:  any[] = [];
  testInfo: any   = null;
  loading   = true;
  testId!:  number;

  private readonly API = buildApiUrl('mock-tests');

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient
  ) {}

  ngOnInit() {
    this.testId = Number(this.route.snapshot.paramMap.get('test_id'));
    this.loadResults();
  }

  loadResults() {
    this.http.get<any>(`${this.API}/${this.testId}/results`).subscribe({
      next: res => {
        this.results = res.results;
        this.loading = false;
      },
      error: () => this.loading = false
    });

    this.http.get<any>(`${this.API}/${this.testId}`).subscribe({
      next: res => this.testInfo = res.test
    });
  }

  get avgScore(): number {
    const submitted = this.results.filter(r => r.status === 'SUBMITTED');
    if (!submitted.length) return 0;
    const total = submitted.reduce((sum, r) => sum + (r.score / r.total_marks * 100), 0);
    return Math.round(total / submitted.length);
  }

  get highScore(): number {
    return this.results[0]?.score ?? 0;
  }

  get submittedCount(): number {
    return this.results.filter(r => r.status === 'SUBMITTED').length;
  }

  getPercent(r: any): number {
    return r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0;
  }

  getBarClass(r: any): string {
    const p = this.getPercent(r);
    if (p >= 70) return 'bar-high';
    if (p >= 40) return 'bar-medium';
    return 'bar-low';
  }

  getRankClass(i: number): string {
    if (i === 0) return 'rank-1';
    if (i === 1) return 'rank-2';
    if (i === 2) return 'rank-3';
    return '';
  }

  exportExcel() {
    const rows = this.results.map((r, i) => ({
      'Rank':         i + 1,
      'Name':         r.student_name,
      'PRN':          r.prn,
      'Program':      r.program_name,
      'Batch':        r.program_batch,
      'Score':        r.score,
      'Total':        r.total_marks,
      'Percentage':   this.getPercent(r) + '%',
      'Status':       r.status,
      'Submitted At': r.submitted_at
        ? new Date(r.submitted_at).toLocaleString()
        : '—'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `test_results_${this.testId}.xlsx`);
  }

  goBack() { this.router.navigate(['/mock-tests']); }
}
