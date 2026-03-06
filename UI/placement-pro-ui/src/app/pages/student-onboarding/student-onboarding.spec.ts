import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentOnboarding } from './student-onboarding';

describe('StudentOnboarding', () => {
  let component: StudentOnboarding;
  let fixture: ComponentFixture<StudentOnboarding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentOnboarding]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentOnboarding);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
