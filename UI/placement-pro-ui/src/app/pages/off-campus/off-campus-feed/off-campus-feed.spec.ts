import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffCampusFeed } from './off-campus-feed';

describe('OffCampusFeed', () => {
  let component: OffCampusFeed;
  let fixture: ComponentFixture<OffCampusFeed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffCampusFeed]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OffCampusFeed);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
