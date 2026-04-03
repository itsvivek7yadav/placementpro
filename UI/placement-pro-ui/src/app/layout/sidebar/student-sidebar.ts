import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Student Sidebar Component
 * 
 * Specialized sidebar for student users with:
 * - Student profile display with avatar and program info
 * - Navigation to student-specific routes (Dashboard, Eligible Drives, Applications, etc.)
 * - Placement status indicator
 * - Responsive design with proper accessibility
 * 
 * @component
 * @selector app-student-sidebar
 */
@Component({
  selector: 'app-student-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-sidebar.html',
  styleUrl: './student-sidebar.scss'
})
export class StudentSidebar implements OnInit, OnDestroy {
  // User Properties
  userName: string = '';
  userInitial: string = '';
  program: string = '';
  
  // Navigation Properties
  placementStatus: 'PLACED' | 'SEEKING' = 'SEEKING';
  eligibleCount: number = 0;
  
  // Lifecycle Management
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.initializeUserData();
  }

  /**
   * Component initialization
   */
  ngOnInit(): void {
    // Subscribe to route events if needed for tracking
    // Example: Update active menu based on route changes
  }

  /**
   * Initialize user data from localStorage
   * 
   * @private
   */
  private initializeUserData(): void {
    try {
      const userJson = localStorage.getItem('user');
      
      if (!userJson) {
        this.setDefaultUserData();
        return;
      }

      const user = JSON.parse(userJson);
      this.userName = this.sanitizeInput(user.name) || 'Student';
      this.userInitial = this.userName.charAt(0).toUpperCase() || 'S';
      this.program = this.sanitizeInput(user.program_name) || 'Student';
      this.placementStatus = this.validatePlacementStatus(user.placement_status);
      this.eligibleCount = Number.isInteger(user.eligible_count) ? user.eligible_count : 0;
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      this.setDefaultUserData();
    }
  }

  /**
   * Set default user data
   * 
   * @private
   */
  private setDefaultUserData(): void {
    this.userName = 'Student';
    this.userInitial = 'S';
    this.program = 'Student';
    this.placementStatus = 'SEEKING';
    this.eligibleCount = 0;
  }

  /**
   * Sanitize user input to prevent XSS
   * 
   * @param input - Raw input string
   * @returns Sanitized string
   * @private
   */
  private sanitizeInput(input: unknown): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/[<>\"']/g, '') // Remove HTML special characters
      .trim()
      .substring(0, 50); // Limit length
  }

  /**
   * Validate placement status enum
   * 
   * @param status - Raw status value
   * @returns Valid placement status
   * @private
   */
  private validatePlacementStatus(status: unknown): 'PLACED' | 'SEEKING' {
    return status === 'PLACED' ? 'PLACED' : 'SEEKING';
  }

  /**
   * Check if a route is currently active
   * 
   * @param route - Route path to check
   * @returns True if route is active
   */
  isActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  /**
   * Navigate to specified route
   * 
   * @param route - Target route
   */
  navigate(route: string): void {
    this.router.navigate([route]).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  /**
   * Logout user and clear session
   */
  logout(): void {
    try {
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(['/login']).catch(error => {
        console.error('Logout navigation error:', error);
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Component cleanup
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
