import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClosedDrives } from './closed-drives';

describe('ClosedDrives', () => {
  let component: ClosedDrives;
  let fixture: ComponentFixture<ClosedDrives>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClosedDrives]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClosedDrives);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
