import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkEmail } from './bulk-email';

describe('BulkEmail', () => {
  let component: BulkEmail;
  let fixture: ComponentFixture<BulkEmail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkEmail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BulkEmail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
