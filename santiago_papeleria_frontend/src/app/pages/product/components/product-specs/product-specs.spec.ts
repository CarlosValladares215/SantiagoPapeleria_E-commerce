import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductSpecs } from './product-specs';

describe('ProductSpecs', () => {
  let component: ProductSpecs;
  let fixture: ComponentFixture<ProductSpecs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductSpecs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductSpecs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
