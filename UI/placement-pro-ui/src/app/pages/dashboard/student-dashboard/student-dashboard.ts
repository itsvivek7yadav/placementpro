import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface StudentStats {
  eligibleDrives: number;
  applied: number;
  resultsAwaited: number;
  selected: number;
}

interface Notification {
  text: string;
  time: string;
  type: 'result' | 'drive' | 'general';
  result?: 'SELECTED' | 'REJECTED';
  read: boolean;
}

interface Application {
  company: string;
  role: string;
  result: 'PENDING' | 'SELECTED' | 'REJECTED';
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.html',
  styleUrls: ['./student-dashboard.scss']
})
export class StudentDashboard implements OnInit {

studentName = '';
studentProgram = '';
greeting = '';
today = '';
placementStatus = 'SEEKING';

  stats: StudentStats = {
    eligibleDrives: 0,
    applied: 0,
    resultsAwaited: 0,
    selected: 0
  };

  notifications: Notification[] = [];
  applications: Application[] = [];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.setGreeting();
    this.loadData();
  }

  setGreeting() {
    const hour = new Date().getHours();
    if (hour < 12)      this.greeting = 'morning';
    else if (hour < 17) this.greeting = 'afternoon';
    else                this.greeting = 'evening';

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.studentName = user.name?.split(' ')[0] || 'Student';
     this.studentProgram = user.program || '';

    this.today = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  loadData() {
    // Replace with real API when ready:
    // this.http.get<any>('http://localhost:5050/api/student/dashboard').subscribe(...)

    this.placementStatus = 'SEEKING';

    this.stats = {
      eligibleDrives: 8,
      applied: 5,
      resultsAwaited: 3,
      selected: 1
    };

    this.notifications = [
      { text: 'TCS Drive — Result declared',     time: '2 hrs ago',  type: 'result', result: 'SELECTED', read: false },
      { text: 'New Drive published — Deloitte',  time: 'Yesterday',  type: 'drive',                      read: false },
      { text: 'Infosys Drive — Result declared', time: '3 days ago', type: 'result', result: 'REJECTED', read: true  }
    ];

    this.applications = [
      { company: 'TCS',       role: 'Software Engineer',   result: 'SELECTED' },
      { company: 'Infosys',   role: 'Systems Engineer',    result: 'REJECTED' },
      { company: 'Deloitte',  role: 'Business Analyst',    result: 'PENDING'  },
      { company: 'Wipro',     role: 'Project Engineer',    result: 'PENDING'  },
      { company: 'Cognizant', role: 'Associate Developer', result: 'PENDING'  }
    ];
  }
}