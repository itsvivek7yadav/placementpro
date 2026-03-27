import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndustryEvents } from './industry-events';

describe('IndustryEvents', () => {
  let component: IndustryEvents;
  let fixture: ComponentFixture<IndustryEvents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndustryEvents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndustryEvents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
