import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriveApplicants } from './drive-applicants';

describe('DriveApplicants', () => {
  let component: DriveApplicants;
  let fixture: ComponentFixture<DriveApplicants>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriveApplicants]
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
