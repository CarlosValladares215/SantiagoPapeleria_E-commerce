import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepAccountTypeComponent } from './step-account-type.component';

describe('StepAccountTypeComponent', () => {
  let component: StepAccountTypeComponent;
  let fixture: ComponentFixture<StepAccountTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepAccountTypeComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(StepAccountTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
