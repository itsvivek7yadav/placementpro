import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EligibleDrives } from './eligible-drives';

describe('EligibleDrives', () => {
  let component: EligibleDrives;
  let fixture: ComponentFixture<EligibleDrives>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EligibleDrives]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EligibleDrives);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
