import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDrives } from './edit-drives';

describe('EditDrives', () => {
  let component: EditDrives;
  let fixture: ComponentFixture<EditDrives>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDrives]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditDrives);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
