import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PlacementService } from '../../../services/placement.service';

interface ManageRoundsDialogData {
  driveId: number;
}

interface EditableRound {
  round_name: string;
  round_order: number;
  description?: string;
}

@Component({
  selector: 'app-manage-rounds-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>Define Rounds for this Drive</h2>

    <mat-dialog-content class="dialog-content">
      <div class="round-row" *ngFor="let round of rounds; let i = index">
        <div class="order-chip">Round {{ round.round_order }}</div>

        <mat-form-field appearance="outline" class="round-name">
          <mat-label>Round Name</mat-label>
          <input
            matInput
            [(ngModel)]="round.round_name"
            placeholder="e.g. Aptitude, Technical, HR" />
        </mat-form-field>

        <button
          mat-icon-button
          type="button"
          aria-label="Remove round"
          (click)="removeRound(i)"
          [disabled]="rounds.length === 1">
          <mat-icon>delete</mat-icon>
        </button>
      </div>

      <button mat-stroked-button type="button" (click)="addRound()">
        <mat-icon>add</mat-icon>
        Add Round
      </button>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(false)" [disabled]="saving">Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="saveRounds()" [disabled]="saving">
        Save Rounds
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      display: grid;
      gap: 16px;
      min-width: 540px;
      padding-top: 8px;
    }

    .round-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
    }

    .order-chip {
      min-width: 72px;
      padding: 8px 10px;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
    }

    .round-name {
      width: 100%;
    }

    @media (max-width: 640px) {
      .dialog-content {
        min-width: 0;
      }

      .round-row {
        grid-template-columns: 1fr auto;
      }

      .order-chip {
        grid-column: 1 / -1;
        justify-self: start;
      }
    }
  `]
})
export class ManageRoundsDialogComponent {
  saving = false;
  rounds: EditableRound[] = [
    { round_name: 'Aptitude', round_order: 1 },
    { round_name: 'Technical', round_order: 2 },
    { round_name: 'HR', round_order: 3 }
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ManageRoundsDialogData,
    public dialogRef: MatDialogRef<ManageRoundsDialogComponent>,
    private placementService: PlacementService,
    private snackBar: MatSnackBar
  ) {}

  addRound(): void {
    this.rounds.push({
      round_name: '',
      round_order: this.rounds.length + 1
    });
  }

  removeRound(index: number): void {
    this.rounds.splice(index, 1);
    this.rounds.forEach((round, i) => {
      round.round_order = i + 1;
    });
  }

  saveRounds(): void {
    const validRounds = this.rounds
      .map((round) => ({
        ...round,
        round_name: round.round_name.trim()
      }))
      .filter((round) => round.round_name !== '');

    if (!validRounds.length) {
      return;
    }

    this.saving = true;
    this.placementService.createRounds(this.data.driveId, validRounds).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.saving = false;
        const message = err?.error?.details || err?.error?.error || 'Failed to save rounds';
        this.snackBar.open(message, 'Close', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }
}
