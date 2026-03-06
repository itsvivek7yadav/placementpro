import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TpoDashboard } from './tpo-dashboard';

describe('TpoDashboard', () => {
  let component: TpoDashboard;
  let fixture: ComponentFixture<TpoDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TpoDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TpoDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
