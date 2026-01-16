import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepShippingLocationComponent } from './step-shipping-location.component';

describe('StepShippingLocationComponent', () => {
  let component: StepShippingLocationComponent;
  let fixture: ComponentFixture<StepShippingLocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepShippingLocationComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(StepShippingLocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
