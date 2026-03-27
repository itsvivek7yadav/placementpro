import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ResumeService, ResumeData, StudentData } from '../../services/resume.service';
import { ResumePreviewComponent } from '../components/resume-preview';

@Component({
  selector: 'app-resume-builder',
  templateUrl: './resume-builder.html',
  styleUrls: ['./resume-builder.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ResumePreviewComponent]
})
export class ResumeBuilderComponent implements OnInit {
  readonly standardResumeType: 'primary' = 'primary';
  readonly standardTemplate: 'modern' = 'modern';

  studentData: StudentData | null = null;
  resumeData: ResumeData = this.getEmptyResumeData();
  studentResumes: any[] = [];
  currentResumeId: number | null = null;

  activeTab: 'edit' | 'preview' = 'edit';

  loading = false;
  saving = false;

  message = '';
  messageType: 'success' | 'error' = 'success';

  canAddResume = true;

  constructor(private resumeService: ResumeService) {}

  ngOnInit(): void {
    this.loadStudentData();
    this.loadStudentResumes();
  }

  loadStudentData(): void {
    this.loading = true;

    this.resumeService.getStudentData().subscribe({
      next: (response: any) => {
        this.studentData = response.data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error(error);
        this.showMessage('Error loading student data', 'error');
        this.loading = false;
      }
    });
  }

  loadStudentResumes(): void {
    this.resumeService.getStudentResumes().subscribe({
      next: (response: any) => {
        this.studentResumes = response.data || [];
        this.canAddResume = this.studentResumes.length < 2;

        if (this.studentResumes.length > 0) {
          const resumeToLoad = this.studentResumes.find((resume: any) => resume.id === this.currentResumeId)
            || this.studentResumes[0];
          this.loadResume(resumeToLoad.id);
        } else {
          this.currentResumeId = null;
        }
      },
      error: (error: any) => {
        console.error(error);
        this.showMessage('Error loading resumes', 'error');
      }
    });
  }

  loadResume(resumeId: number): void {
    this.loading = true;

    this.resumeService.getResume(resumeId).subscribe({
      next: (response: any) => {
        const resume = response.data;
        this.resumeData = resume.data;
        this.currentResumeId = resume.id;
        this.activeTab = 'edit';
        this.loading = false;
      },
      error: (error: any) => {
        console.error(error);
        this.showMessage('Error loading resume', 'error');
        this.loading = false;
      }
    });
  }

  saveResume(): void {
    if (!this.validateForm()) {
      this.showMessage('Please fill in required fields', 'error');
      return;
    }

    this.saving = true;

    // FIX: pass resumeData and template separately — service now handles the correct payload shape
    this.resumeService.saveResume(this.resumeData, this.standardResumeType, this.standardTemplate).subscribe({
      next: (response: any) => {
        this.currentResumeId = response?.id ?? this.currentResumeId;
        this.showMessage('Resume saved successfully!', 'success');
        this.loadStudentResumes();
        this.saving = false;
      },
      error: (error: any) => {
        console.error(error);
        this.showMessage('Error saving resume', 'error');
        this.saving = false;
      }
    });
  }

  downloadPDF(): void {
    if (!this.currentResumeId) {
      this.showMessage('Save your resume first to generate the polished PDF.', 'error');
      return;
    }

    this.downloadSavedResume(this.currentResumeId);
  }

  downloadSavedResume(resumeId: number): void {
    this.loading = true;

    this.resumeService.downloadPDF(resumeId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `resume_${Date.now()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.loading = false;
      },
      error: () => {
        this.showMessage('Error generating PDF', 'error');
        this.loading = false;
      }
    });
  }

  deleteResume(resumeId: number): void {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    this.loading = true;

    this.resumeService.deleteResume(resumeId).subscribe({
      next: () => {
        this.showMessage('Resume deleted successfully!', 'success');
        this.loadStudentResumes();
        this.loading = false;
      },
      error: () => {
        this.showMessage('Error deleting resume', 'error');
        this.loading = false;
      }
    });
  }

  validateForm(): boolean {
    return !!this.resumeData.personalSummary?.trim();
  }

  startNewResume(): void {
    this.currentResumeId = null;
    this.resumeData = this.getEmptyResumeData();
    this.activeTab = 'edit';
  }

  get completionScore(): number {
    const checks = [
      !!this.resumeData.personalSummary?.trim(),
      this.resumeData.experience.length > 0,
      this.resumeData.projects.length > 0,
      this.resumeData.skills.technical.length > 0,
      this.resumeData.certifications.length > 0,
      this.resumeData.languages.length > 0
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  get completionLabel(): string {
    if (this.completionScore >= 80) return 'Strong profile';
    if (this.completionScore >= 50) return 'Good start';
    return 'Needs more detail';
  }

  showMessage(text: string, type: 'success' | 'error'): void {
    this.message = text;
    this.messageType = type;
    setTimeout(() => (this.message = ''), 3000);
  }

  getEmptyResumeData(): ResumeData {
    return {
      personalSummary: '',
      experience: [],
      skills: { technical: [], soft: [] },
      projects: [],
      certifications: [],
      languages: [],
      achievements: []
    };
  }

  addExperience(): void {
    this.resumeData.experience.push({
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      currentlyWorking: false,
      description: ''
    });
  }

  removeExperience(index: number): void {
    this.resumeData.experience.splice(index, 1);
  }

  addSkill(type: 'technical' | 'soft', skill: string): void {
    if (skill.trim()) {
      this.resumeData.skills[type].push(skill.trim());
    }
  }

  removeSkill(type: 'technical' | 'soft', index: number): void {
    this.resumeData.skills[type].splice(index, 1);
  }

  addProject(): void {
    this.resumeData.projects.push({
      title: '',
      description: '',
      technologies: '',
      link: ''
    });
  }

  removeProject(index: number): void {
    this.resumeData.projects.splice(index, 1);
  }

  addCertification(): void {
    this.resumeData.certifications.push({
      name: '',
      issuer: '',
      issueDate: ''
    });
  }

  removeCertification(index: number): void {
    this.resumeData.certifications.splice(index, 1);
  }

  addLanguage(): void {
    this.resumeData.languages.push({
      language: '',
      proficiency: 'Professional'
    });
  }

  removeLanguage(index: number): void {
    this.resumeData.languages.splice(index, 1);
  }

  addAchievement(): void {
    this.resumeData.achievements.push({
      title: '',
      description: ''
    });
  }

  removeAchievement(index: number): void {
    this.resumeData.achievements.splice(index, 1);
  }
}
