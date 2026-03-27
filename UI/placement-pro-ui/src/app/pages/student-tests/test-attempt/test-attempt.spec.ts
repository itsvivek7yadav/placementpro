import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestAttempt } from './test-attempt';

describe('TestAttempt', () => {
  let component: TestAttempt;
  let fixture: ComponentFixture<TestAttempt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestAttempt]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestAttempt);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
