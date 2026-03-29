import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { buildApiUrl } from '../../../api.config';

interface DriveStats {
  drive_id: number;
  company_name: string;
  status: 'LIVE' | 'CLOSED';
  statusLabel: string;
  statusTone: 'open' | 'pending' | 'declared' | 'closed';
  applicationCount: number;
}

interface DashboardStats {
  totalStudents: number;
  totalPlaced: number;
  totalDrives: number;
  activeDrives: number;
  totalApplications: number;
  driveStats: DriveStats[];
}

interface TodoItem {
  text: string;
  done: boolean;
}

@Component({
  selector: 'app-tpo-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tpo-dashboard.html',
  styleUrls: ['./tpo-dashboard.scss']
})
export class TpoDashboard {

  stats: DashboardStats | null = null;
  loading = false;

  greeting = '';
  tpoName = '';
  today = '';

  todos: TodoItem[] = [];
  newTodo = '';

  get completedCount(): number {
    return this.todos.filter(t => t.done).length;
  }

  private readonly TODO_KEY      = 'tpo_todos';
  private readonly TODO_DATE_KEY = 'tpo_todos_date';

  constructor(private http: HttpClient) {
    this.setGreeting();
    this.loadTodos();
    this.loadStats();
  }

  setGreeting() {
    const hour = new Date().getHours();
    if (hour < 12)      this.greeting = 'morning';
    else if (hour < 17) this.greeting = 'afternoon';
    else                this.greeting = 'evening';

    const user = localStorage.getItem('user');
    if (user) {
      this.tpoName = JSON.parse(user).name?.split(' ')[0] || 'TPO';
    }

    this.today = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  loadStats() {
    this.loading = true;
    this.http.get<DashboardStats>(buildApiUrl('tpo/dashboard/stats')).subscribe({
      next:  (res) => { this.stats = res; this.loading = false; },
      error: (err) => { console.error(err); this.loading = false; }
    });
  }

  loadTodos() {
    const todayStr  = new Date().toDateString();
    const savedDate = localStorage.getItem(this.TODO_DATE_KEY);

    if (savedDate !== todayStr) {
      localStorage.setItem(this.TODO_DATE_KEY, todayStr);
      localStorage.removeItem(this.TODO_KEY);
      this.todos = [];
    } else {
      const saved = localStorage.getItem(this.TODO_KEY);
      this.todos = saved ? JSON.parse(saved) : [];
    }
  }

  saveTodos() {
    localStorage.setItem(this.TODO_KEY, JSON.stringify(this.todos));
  }

  addTodo() {
    const text = this.newTodo.trim();
    if (!text) return;
    this.todos.push({ text, done: false });
    this.newTodo = '';
    this.saveTodos();
  }

  toggleTodo(index: number) {
    this.todos[index].done = !this.todos[index].done;
    this.saveTodos();
  }

  deleteTodo(index: number) {
    this.todos.splice(index, 1);
    this.saveTodos();
  }
}
