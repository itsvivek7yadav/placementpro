import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './students.html',
  styleUrls: ['./students.scss']
})
export class Students implements OnInit {

  students: any[] = [];
  filteredStudents: any[] = [];
  loading = true;
  searched = false; // ← tracks if search has been triggered

  // Filter state
  searchTerm   = '';
  programFilter = '';
  batchFilter   = '';
  cgpaFilter    = '';
  statusFilter  = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.http.get<{ students: any[] }>('http://localhost:5050/api/students')
      .subscribe({
        next: (res) => {
          this.students = res.students;
          this.filteredStudents = [];  // ← empty until search
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load students', err);
          this.loading = false;
        }
      });
  }

  // ── Called on Search button click ──
  triggerSearch() {
    this.searched = true;
    this.applyFilters();
  }

  // ── Apply all active filters ──
  applyFilters() {
    let list = [...this.students];

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(s =>
        (s.first_name  || '').toLowerCase().includes(q) ||
        (s.last_name   || '').toLowerCase().includes(q) ||
        (s.name        || '').toLowerCase().includes(q) ||
        (s.prn         || '').toLowerCase().includes(q) ||
        (s.college_email || '').toLowerCase().includes(q)
      );
    }

    if (this.programFilter) {
      list = list.filter(s => s.program_name === this.programFilter);
    }

    if (this.batchFilter) {
      list = list.filter(s => s.program_batch === this.batchFilter);
    }

    if (this.cgpaFilter) {
      list = list.filter(s => s.cgpa >= Number(this.cgpaFilter));
    }

    if (this.statusFilter) {
      list = list.filter(s => s.placement_status === this.statusFilter);
    }

    this.filteredStudents = list;
  }

  // ── Reset everything ──
  resetFilters() {
    this.searchTerm    = '';
    this.programFilter = '';
    this.batchFilter   = '';
    this.cgpaFilter    = '';
    this.statusFilter  = '';
    this.searched      = false;
    this.filteredStudents = [];
  }

  exportCSV() {
    const headers = [
      'Name', 'PRN', 'College Email', 'Personal Email', 'Phone',
      'Gender', 'Program', 'Batch', 'CGPA',
      'UG Course', 'UG Specialization', 'UG %',
      'PG Program', 'PG Specialization',
      'Sem1', 'Sem2', 'Sem3',
      'Backlog', 'Work Exp', 'State', 'Status'
    ];

    const rows = this.filteredStudents.map(s => [
      s.name, s.prn, s.college_email, s.personal_email, s.phone_number,
      s.gender, s.program_name, s.program_batch, s.cgpa,
      s.ug_course_name, s.ug_specialization, s.ug_percentage,
      s.sicsr_program_name, s.sicsr_specialization,
      s.sem1_gpa, s.sem2_gpa, s.sem3_gpa,
      s.backlog ? 'Yes' : 'No',
      s.work_experience ? 'Yes' : 'No',
      s.state, s.placement_status
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${v ?? ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'students.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}