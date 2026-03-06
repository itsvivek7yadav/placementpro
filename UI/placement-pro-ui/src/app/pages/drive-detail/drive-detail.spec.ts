import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriveDetail } from './drive-detail';

describe('DriveDetail', () => {
  let component: DriveDetail;
  let fixture: ComponentFixture<DriveDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriveDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriveDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
