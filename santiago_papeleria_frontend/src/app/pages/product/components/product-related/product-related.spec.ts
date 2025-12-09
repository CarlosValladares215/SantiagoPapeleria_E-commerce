import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductRelated } from './product-related';

describe('ProductRelated', () => {
  let component: ProductRelated;
  let fixture: ComponentFixture<ProductRelated>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductRelated]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductRelated);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
