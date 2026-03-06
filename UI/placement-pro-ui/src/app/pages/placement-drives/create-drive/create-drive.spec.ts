import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateDrive } from './create-drive';

describe('CreateDrive', () => {
  let component: CreateDrive;
  let fixture: ComponentFixture<CreateDrive>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateDrive]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateDrive);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
