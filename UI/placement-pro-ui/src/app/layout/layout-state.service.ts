import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutStateService {
  private readonly mobileBreakpoint = 900;
  private readonly isMobileSubject = new BehaviorSubject<boolean>(this.detectMobile());
  private readonly sidebarOpenSubject = new BehaviorSubject<boolean>(false);

  readonly isMobile$ = this.isMobileSubject.asObservable();
  readonly sidebarOpen$ = this.sidebarOpenSubject.asObservable();

  get isMobile(): boolean {
    return this.isMobileSubject.value;
  }

  get sidebarOpen(): boolean {
    return this.sidebarOpenSubject.value;
  }

  syncViewport(): void {
    const mobile = this.detectMobile();
    this.isMobileSubject.next(mobile);

    if (!mobile) {
      this.sidebarOpenSubject.next(false);
    }
  }

  toggleSidebar(): void {
    if (!this.isMobileSubject.value) return;
    this.sidebarOpenSubject.next(!this.sidebarOpenSubject.value);
  }

  closeSidebar(): void {
    this.sidebarOpenSubject.next(false);
  }

  private detectMobile(): boolean {
    return typeof window !== 'undefined' ? window.innerWidth <= this.mobileBreakpoint : false;
  }
}
