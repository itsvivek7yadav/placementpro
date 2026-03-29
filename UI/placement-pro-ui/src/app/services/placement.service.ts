import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Applicant, DriveRound } from '../models/drive-applicants.models';

export interface DriveApplicantsResponse {
  rounds: DriveRound[];
  applications: Applicant[];
}

export interface CreateRoundPayload {
  round_name: string;
  round_order: number;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlacementService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getApplicationsForDrive(driveId: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/drives/${driveId}/applications`, {
      responseType: 'text'
    });
  }

  createRounds(driveId: number, rounds: CreateRoundPayload[]) {
    return this.http.post(`${this.apiUrl}/drives/${driveId}/rounds`, { rounds });
  }
}
