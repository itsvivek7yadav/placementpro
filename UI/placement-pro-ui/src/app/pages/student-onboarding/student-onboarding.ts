import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-student-onboarding',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-onboarding.html',
  styleUrls: ['./student-onboarding.scss']
})
export class StudentOnboarding {

  selectedFile: File | null = null;
  loading = false;
  isDragging = false;
  successMessage = '';
  errorMessage = '';

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      this.setFile(file);
    } else {
      this.errorMessage = 'Please drop a valid .xlsx file.';
    }
  }

  setFile(file: File) {
    this.selectedFile = file;
    this.successMessage = '';
    this.errorMessage = '';
  }

  removeFile(event: MouseEvent) {
    event.stopPropagation();
    this.selectedFile = null;
  }

  uploadFile() {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.post<any>('http://localhost:5050/api/upload/students', formData).subscribe({
      next: (res) => {
        this.loading = false;
        this.selectedFile = null;
        this.successMessage = `${res.inserted} student(s) added successfully. ${res.skipped} skipped.`;
        setTimeout(() => { this.successMessage = ''; }, 6000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Upload failed. Please check the file format and try again.';
      }
    });
  }
}