import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * TPO (Training and Placement Officer) Sidebar Component
 * 
 * Specialized sidebar for TPO administrators with:
 * - Institute/Organization profile display
 * - Collapsible menu for Placement Drives with sub-items
 * - Navigation to TPO-specific features (Student Onboarding, Mock Tests, etc.)
 * - Admin-level access controls
 * 
 * @component
 * @selector app-tpo-sidebar
 */
@Component({
  selector: 'app-tpo-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tpo-sidebar.html',
  styleUrl: './tpo-sidebar.scss'
})
export class TpoSidebar implements OnInit, OnDestroy {
  // Menu Expansion State
  drivesExpanded: boolean = false;

  // Lifecycle Management
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.initializeMenuState();
  }

  /**
   * Component initialization
   */
  ngOnInit(): void {
    // Monitor route changes to update menu state
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateMenuStateFromRoute();
      });
  }

  /**
   * Initialize menu state based on current route
   * 
   * @private
   */
  private initializeMenuState(): void {
    this.updateMenuStateFromRoute();
  }

  /**
   * Update menu expansion state based on current route
   * 
   * @private
   */
  private updateMenuStateFromRoute(): void {
    try {
      // Auto-expand drives submenu if currently on a placement-drives route
      this.drivesExpanded = this.router.url.includes('/placement-drives');
    } catch (error) {
      console.error('Error updating menu state from route:', error);
      this.drivesExpanded = false;
    }
  }

  /**
   * Toggle Placement Drives submenu expansion
   * 
   * Called when user clicks on the Placement Drives menu item
   */
  toggleDrives(): void {
    this.drivesExpanded = !this.drivesExpanded;
  }

  /**
   * Check if a specific route is currently active
   * 
   * @param route - Route path to check
   * @returns True if the route is active
   */
  isActive(route: string): boolean {
    try {
      return this.router.url.includes(route);
    } catch (error) {
      console.error('Error checking active route:', error);
      return false;
    }
  }

  /**
   * Navigate to specified route
   * 
   * @param route - Target route path
   */
  navigate(route: string): void {
    this.router.navigate([route]).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  /**
   * Logout TPO user and clear session
   * 
   * Clears all stored data and redirects to login page
   */
  logout(): void {
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Navigate to login
      this.router.navigate(['/login']).catch(error => {
        console.error('Logout navigation error:', error);
        // Force redirect as fallback
        window.location.href = '/login';
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect as fallback
      window.location.href = '/login';
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
