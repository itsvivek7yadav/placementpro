import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestScore } from './test-score';

describe('TestScore', () => {
  let component: TestScore;
  let fixture: ComponentFixture<TestScore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestScore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestScore);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
