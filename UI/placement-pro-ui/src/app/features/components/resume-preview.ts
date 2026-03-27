import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentData, ResumeData } from '../../services/resume.service';

@Component({
  selector: 'app-resume-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resume-preview.html',
  styleUrls: ['./resume-preview.scss']
})
export class ResumePreviewComponent {
  @Input() student: StudentData | null = null;
  @Input() resume: ResumeData | null = null;

  get fullName(): string {
    return [this.student?.firstName, this.student?.lastName].filter(Boolean).join(' ') || 'Your Name';
  }

  get headline(): string {
    return [this.student?.degree, this.student?.branch].filter(Boolean).join(' • ');
  }

  get location(): string {
    return [this.student?.city, this.student?.state].filter(Boolean).join(', ');
  }

  formatMonthYear(value: string): string {
    if (!value) return '';
    const [year, month] = value.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const index = Number(month) - 1;
    return year && index >= 0 && index < 12 ? `${names[index]} ${year}` : value;
  }

  formatRange(startDate: string, endDate: string, currentlyWorking: boolean): string {
    const start = this.formatMonthYear(startDate);
    const end = currentlyWorking ? 'Present' : (this.formatMonthYear(endDate) || 'Present');
    return [start, end].filter(Boolean).join(' - ');
  }

  getBulletLines(value: string): string[] {
    return (value || '')
      .split('\n')
      .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean);
  }

  getTechTags(value: string): string[] {
    return (value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
