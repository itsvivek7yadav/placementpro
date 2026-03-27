import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-test-score',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-score.html',
  styleUrls: ['./test-score.scss']
})
export class TestScore implements OnInit {

  score       = 0;
  total_marks = 0;
  title       = '';
  percentage  = 0;

  constructor(private router: Router) {}

  ngOnInit() {
    const state = history.state;
    if (!state?.score && state?.score !== 0) {
      this.router.navigate(['/tests']);
      return;
    }
    this.score       = state.score;
    this.total_marks = state.total_marks;
    this.title       = state.title;
    this.percentage  = this.total_marks > 0
      ? Math.round((this.score / this.total_marks) * 100)
      : 0;
  }

  goBack() { this.router.navigate(['/tests']); }
}