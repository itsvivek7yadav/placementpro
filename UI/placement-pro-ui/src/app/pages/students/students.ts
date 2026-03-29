import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { buildApiUrl } from '../../api.config';

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
  showAcademicFilters = false;
  useAcademicFilters = false;
  overallAcademicThreshold = '';
  ugCgpaFilter = '';
  stdXiiCgpaFilter = '';
  stdXCgpaFilter = '';
  sem1GpaFilter = '';
  sem2GpaFilter = '';
  sem3GpaFilter = '';
  ugPercentageFilter = '';
  stdXiiPercentageFilter = '';
  stdXPercentageFilter = '';
  statusFilter  = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.http.get<{ students: any[] }>(buildApiUrl('students'))
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

    const minValue = (value: any) => {
      if (value === null || value === undefined || String(value).trim() === '') {
        return null;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const applyMinFilter = (items: any[], field: string, filterValue: any) => {
      const min = minValue(filterValue);
      if (min === null) return items;

      return items.filter(item => {
        const current = Number(item?.[field]);
        return Number.isFinite(current) && current >= min;
      });
    };

    const meetsOverallAcademicThreshold = (student: any, thresholdValue: any) => {
      const threshold = minValue(thresholdValue);
      if (threshold === null) return true;

      const percentageFields = [
        'std_x_percentage',
        'std_xii_percentage',
        'ug_percentage'
      ];

      const cgpaEquivalentFields = [
        'std_x_cgpa',
        'std_xii_cgpa',
        'ug_cgpa',
        'sem1_gpa',
        'sem2_gpa',
        'sem3_gpa',
        'cgpa'
      ];

      const academicValues = [
        ...percentageFields.map(field => Number(student?.[field])),
        ...cgpaEquivalentFields.map(field => Number(student?.[field]) * 10)
      ].filter(value => Number.isFinite(value));

      if (academicValues.length === 0) {
        return true;
      }

      return academicValues.every(value => value >= threshold);
    };

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(s =>
        (s.first_name  || '').toLowerCase().includes(q) ||
        (s.middle_name || '').toLowerCase().includes(q) ||
        (s.last_name   || '').toLowerCase().includes(q) ||
        (s.name        || '').toLowerCase().includes(q) ||
        (s.prn         || '').toLowerCase().includes(q) ||
        (s.college_email || '').toLowerCase().includes(q) ||
        (s.personal_email || '').toLowerCase().includes(q)
      );
    }

    if (this.programFilter) {
      list = list.filter(s => s.program_name === this.programFilter);
    }

    if (this.batchFilter) {
      list = list.filter(s => s.program_batch === this.batchFilter);
    }

    if (this.useAcademicFilters) {
      list = list.filter(student => meetsOverallAcademicThreshold(student, this.overallAcademicThreshold));

      list = applyMinFilter(list, 'ug_cgpa', this.ugCgpaFilter);
      list = applyMinFilter(list, 'std_xii_cgpa', this.stdXiiCgpaFilter);
      list = applyMinFilter(list, 'std_x_cgpa', this.stdXCgpaFilter);
      list = applyMinFilter(list, 'sem1_gpa', this.sem1GpaFilter);
      list = applyMinFilter(list, 'sem2_gpa', this.sem2GpaFilter);
      list = applyMinFilter(list, 'sem3_gpa', this.sem3GpaFilter);
      list = applyMinFilter(list, 'ug_percentage', this.ugPercentageFilter);
      list = applyMinFilter(list, 'std_xii_percentage', this.stdXiiPercentageFilter);
      list = applyMinFilter(list, 'std_x_percentage', this.stdXPercentageFilter);
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
    this.showAcademicFilters = false;
    this.useAcademicFilters = false;
    this.overallAcademicThreshold = '';
    this.ugCgpaFilter = '';
    this.stdXiiCgpaFilter = '';
    this.stdXCgpaFilter = '';
    this.sem1GpaFilter = '';
    this.sem2GpaFilter = '';
    this.sem3GpaFilter = '';
    this.ugPercentageFilter = '';
    this.stdXiiPercentageFilter = '';
    this.stdXPercentageFilter = '';
    this.statusFilter  = '';
    this.searched      = false;
    this.filteredStudents = [];
  }

  toggleAcademicFilters() {
    this.showAcademicFilters = !this.showAcademicFilters;
  }

  exportCSV() {
    const headers = [
      'Program',
      'Batch',
      'Placement Status',
      'College Email',
      'PRN',
      'First Name',
      'Middle Name',
      'Last Name',
      'Personal Email',
      'Date of Birth',
      'Gender',
      'Phone Number',
      'WhatsApp Number',
      'WhatsApp Link',
      'LinkedIn Profile URL',
      'City',
      'State',
      'Country',
      'Std X Percentage',
      'Std X CGPA',
      'Std XII Percentage',
      'Std XII CGPA',
      'UG Course',
      'UG Specialization',
      'UG University',
      'UG Percentage',
      'UG CGPA',
      'UG Year',
      'Educational Background',
      'SICSR Program Name',
      'SICSR Specialization',
      'Sem 1 GPA',
      'Sem 2 GPA',
      'Sem 3 GPA',
      'Final CGPA',
      'Backlog',
      'Interested Job Roles',
      'Work Experience',
      'Total Work Experience',
      'Last Company Name',
      'Last Company Industry'
    ];

    const rows = this.filteredStudents.map(s => [
      s.program_name,
      s.program_batch,
      s.placement_status,
      s.college_email,
      s.prn,
      s.first_name,
      s.middle_name,
      s.last_name,
      s.personal_email,
      s.date_of_birth,
      s.gender,
      s.phone_number,
      s.whatsapp_number,
      s.whatsapp_link,
      s.linkedin_profile_url,
      s.city,
      s.state,
      s.country,
      s.std_x_percentage,
      s.std_x_cgpa,
      s.std_xii_percentage,
      s.std_xii_cgpa,
      s.ug_course_name,
      s.ug_specialization,
      s.ug_university,
      s.ug_percentage,
      s.ug_cgpa,
      s.ug_year,
      s.educational_background,
      s.sicsr_program_name,
      s.sicsr_specialization,
      s.sem1_gpa,
      s.sem2_gpa,
      s.sem3_gpa,
      s.cgpa,
      s.backlog ? 'Yes' : 'No',
      s.interested_job_roles,
      s.work_experience ? 'Yes' : 'No',
      s.total_work_experience,
      s.last_company_name,
      s.last_company_industry
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

  viewStudentProgress(studentId: number) {
    this.router.navigate(['/students', studentId, 'progress']);
  }
}
