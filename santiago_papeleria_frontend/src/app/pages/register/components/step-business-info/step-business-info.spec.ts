import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepBusinessInfoComponent } from './step-business-info.component';

describe('StepBusinessInfoComponent', () => {
  let component: StepBusinessInfoComponent;
  let fixture: ComponentFixture<StepBusinessInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepBusinessInfoComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(StepBusinessInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
