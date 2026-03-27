import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { buildApiUrl } from '../../../api.config';

@Component({
  selector: 'app-test-attempt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-attempt.html',
  styleUrls: ['./test-attempt.scss']
})
export class TestAttempt implements OnInit, OnDestroy {

  test:      any    = null;
  questions: any[]  = [];
  answers:   Map<number, string> = new Map(); // question_id → chosen_ans
  currentIndex = 0;
  loading      = true;
  submitting   = false;
  errorMsg     = '';

  // Timer
  timeLeft   = 0;
  timerInterval: any;

  private API = buildApiUrl('/student-tests');

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient
  ) {}

  ngOnInit() {
    const testId = this.route.snapshot.paramMap.get('test_id');
    if (testId) this.loadTest(+testId);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  loadTest(testId: number) {
    this.http.get<any>(`${this.API}/${testId}/start`).subscribe({
      next: res => {
        this.test      = res.test;
        this.questions = res.questions;
        this.timeLeft  = this.test.duration_mins * 60;
        this.loading   = false;
        this.startTimer();
      },
      error: err => {
        this.errorMsg = err.error?.message || 'Failed to load test';
        this.loading  = false;
      }
    });
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        this.submitTest(); // auto submit
      }
    }, 1000);
  }

  get formattedTime(): string {
    const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
    const s = (this.timeLeft % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get isTimeLow(): boolean { return this.timeLeft <= 300; } // last 5 mins

  get currentQuestion(): any {
    return this.questions[this.currentIndex];
  }

  selectAnswer(questionId: number, option: string) {
    this.answers.set(questionId, option);
  }

  getAnswer(questionId: number): string {
    return this.answers.get(questionId) || '';
  }

  isAnswered(questionId: number): boolean {
    return this.answers.has(questionId);
  }

  goTo(index: number) { this.currentIndex = index; }
  prev() { if (this.currentIndex > 0) this.currentIndex--; }
  next() { if (this.currentIndex < this.questions.length - 1) this.currentIndex++; }

  get answeredCount(): number { return this.answers.size; }
  get totalCount():    number { return this.questions.length; }

  submitTest() {
    if (this.submitting) return;

    const unanswered = this.totalCount - this.answeredCount;
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
    }

    clearInterval(this.timerInterval);
    this.submitting = true;

    const answers = this.questions.map(q => ({
      question_id: q.question_id,
      chosen_ans:  this.answers.get(q.question_id) || null
    }));

    this.http.post<any>(`${this.API}/${this.test.test_id}/submit`, { answers }).subscribe({
      next: res => {
        this.router.navigate(['/tests/score'], {
          state: {
            score:       res.score,
            total_marks: res.total_marks,
            title:       this.test.title
          }
        });
      },
      error: err => {
        this.errorMsg   = err.error?.message || 'Submit failed';
        this.submitting = false;
      }
    });
  }
}
