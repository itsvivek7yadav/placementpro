import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpportunityCard } from './opportunity-card';

describe('OpportunityCard', () => {
  let component: OpportunityCard;
  let fixture: ComponentFixture<OpportunityCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpportunityCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpportunityCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
