import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenDrives } from './open-drives';

describe('OpenDrives', () => {
  let component: OpenDrives;
  let fixture: ComponentFixture<OpenDrives>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenDrives]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenDrives);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
