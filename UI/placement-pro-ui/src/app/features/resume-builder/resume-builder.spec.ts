import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumeBuilder } from './resume-builder';

describe('ResumeBuilder', () => {
  let component: ResumeBuilder;
  let fixture: ComponentFixture<ResumeBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumeBuilder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumeBuilder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
