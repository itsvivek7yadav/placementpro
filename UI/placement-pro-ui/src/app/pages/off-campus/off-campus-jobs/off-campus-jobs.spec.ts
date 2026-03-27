import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffCampusJobs } from './off-campus-jobs';

describe('OffCampusJobs', () => {
  let component: OffCampusJobs;
  let fixture: ComponentFixture<OffCampusJobs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffCampusJobs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OffCampusJobs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
