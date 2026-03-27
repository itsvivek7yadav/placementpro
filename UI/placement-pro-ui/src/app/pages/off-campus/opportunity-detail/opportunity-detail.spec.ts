import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpportunityDetail } from './opportunity-detail';

describe('OpportunityDetail', () => {
  let component: OpportunityDetail;
  let fixture: ComponentFixture<OpportunityDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpportunityDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpportunityDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
