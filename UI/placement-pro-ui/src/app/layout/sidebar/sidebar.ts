import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

/**
 * Base Sidebar Component
 * 
 * Provides the foundational sidebar layout with Material Design components.
 * Serves as a base for specialized sidebar implementations (Student, TPO).
 * 
 * @component
 * @selector app-sidebar
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  /**
   * Component initialization
   */
  ngOnInit(): void {
    // Initialize any required data or subscriptions
  }
}
