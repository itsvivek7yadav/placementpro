import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestResults } from './test-results';

describe('TestResults', () => {
  let component: TestResults;
  let fixture: ComponentFixture<TestResults>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestResults]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestResults);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
