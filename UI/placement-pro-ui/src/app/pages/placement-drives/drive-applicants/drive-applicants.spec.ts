import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DriveApplicants } from './drive-applicants';

describe('DriveApplicants', () => {
  let component: DriveApplicants;
  let fixture: ComponentFixture<DriveApplicants>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriveApplicants, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ drive_id: '1' })
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriveApplicants);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
