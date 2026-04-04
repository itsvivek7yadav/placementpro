import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { buildApiUrl } from '../../../api.config';
import { AuthService } from '../../../auth/auth';

interface FilterOption {
  value: number;
  label: string;
}

interface SummaryKpis {
  totalStudentsEligible: number;
  totalStudentsPlaced: number;
  placementPercentage: number;
  totalCompaniesVisited: number;
  averagePackage: number;
  medianPackage: number;
  highestPackage: number;
  totalOffersMade: number;
  studentsAwaitingResult: number;
  studentsMarkedAbsent: number;
  absentRatio: number;
  offerRatio: number;
  recruitersWithSelections: number;
}

interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

interface RecruiterRow {
  companyName: string;
  offers?: number;
  totalApplications?: number;
  avgPackage?: number;
  highestPackage?: number;
  applications?: number;
}

interface TrendPoint {
  label: string;
  offers: number;
  placedStudents: number;
  averagePackage: number;
}

interface ProgramPerformance {
  programName: string;
  eligibleStudents: number;
  placedStudents: number;
  placementPercentage: number;
}

interface StudentReportRow {
  studentId: number;
  studentName: string;
  prn: string;
  programName: string;
  batch: string;
  placementStatus: string;
  applicationsCount: number;
  absentCount: number;
  selectedCompany: string | null;
  selectedJobType: string | null;
  bestPackage: number;
  lastAppliedAt: string | null;
}

interface PlacementReportResponse {
  filterOptions: {
    batches: string[];
    programs: string[];
    academicYears: FilterOption[];
  };
  selectedFilters: {
    batch: string | null;
    programs: string[];
    academicYear: FilterOption | null;
  };
  summaryKPIs: SummaryKpis;
  jobTypeDistribution: ChartSlice[];
  companyStats: {
    totalCompanies: number;
    topRecruiters: RecruiterRow[];
    zeroSelectionCompanies: RecruiterRow[];
  };
  trends: {
    placementTrend: TrendPoint[];
    programPerformance: ProgramPerformance[];
  };
  studentTableData: StudentReportRow[];
  generatedAt: string;
}

@Component({
  selector: 'app-placement-report-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './placement-report-dashboard.html',
  styleUrls: ['./placement-report-dashboard.scss']
})
export class PlacementReportDashboard implements OnInit {
  private readonly apiUrl = buildApiUrl('reports/tpo');

  loading = true;
  exporting = false;
  errorMessage = '';
  report: PlacementReportResponse | null = null;

  selectedBatch = '';
  selectedPrograms: string[] = [];
  selectedAcademicYear: number | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';

    let params = new HttpParams();
    if (this.selectedBatch) {
      params = params.set('batch', this.selectedBatch);
    }
    if (this.selectedPrograms.length) {
      params = params.set('program', this.selectedPrograms.join(','));
    }
    if (this.selectedAcademicYear) {
      params = params.set('academicYear', String(this.selectedAcademicYear));
    }

    this.http.get<PlacementReportResponse>(this.apiUrl, {
      params,
      headers: this.authService.getAuthHeaders()
    }).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load placement report', err);
        this.errorMessage = err?.error?.message || 'Unable to load placement report right now.';
        this.loading = false;
      }
    });
  }

  resetFilters(): void {
    this.selectedBatch = '';
    this.selectedPrograms = [];
    this.selectedAcademicYear = null;
    this.loadReport();
  }

  downloadReport(): void {
    if (!this.report?.studentTableData?.length) return;

    this.exporting = true;
    const headers = [
      'Student Name',
      'PRN',
      'Program',
      'Batch',
      'Placement Status',
      'No of Applications',
      'Absent Count',
      'Selected Company',
      'Selected Job Type',
      'Best Package',
      'Last Applied At'
    ];

    const rows = this.report.studentTableData.map((row) => [
      row.studentName,
      row.prn,
      row.programName,
      row.batch,
      row.placementStatus,
      row.applicationsCount,
      row.absentCount,
      row.selectedCompany || '—',
      row.selectedJobType || '—',
      row.bestPackage,
      row.lastAppliedAt || '—'
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'placement-report-dashboard.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.exporting = false;
  }

  get filters() {
    return this.report?.filterOptions || {
      batches: [],
      programs: [],
      academicYears: []
    };
  }

  get kpiCards() {
    if (!this.report) return [];

    const data = this.report.summaryKPIs;
    return [
      { label: 'Eligible Students', value: `${data.totalStudentsEligible}`, tone: 'blue' },
      { label: 'Placed Students', value: `${data.totalStudentsPlaced}`, tone: 'green' },
      { label: 'Placement %', value: `${data.placementPercentage}%`, tone: 'teal' },
      { label: 'Offers Made', value: `${data.totalOffersMade}`, tone: 'violet' },
      { label: 'Companies Visited', value: `${data.totalCompaniesVisited}`, tone: 'amber' },
      { label: 'Avg Package', value: `${data.averagePackage} LPA`, tone: 'sky' },
      { label: 'Median Package', value: `${data.medianPackage} LPA`, tone: 'indigo' },
      { label: 'Highest Package', value: `${data.highestPackage} LPA`, tone: 'rose' },
      { label: 'Awaiting Result', value: `${data.studentsAwaitingResult}`, tone: 'slate' },
      { label: 'Absent Ratio', value: `${data.absentRatio}%`, tone: 'orange' }
    ];
  }

  get pieChartStyle() {
    const segments = this.report?.jobTypeDistribution || [];
    const total = segments.reduce((sum, item) => sum + item.value, 0);
    if (!total) {
      return { background: 'conic-gradient(#dbeafe 0deg 360deg)' };
    }

    let current = 0;
    const parts = segments.map((item) => {
      const angle = (item.value / total) * 360;
      const start = current;
      current += angle;
      return `${item.color} ${start}deg ${current}deg`;
    });

    return { background: `conic-gradient(${parts.join(', ')})` };
  }

}
