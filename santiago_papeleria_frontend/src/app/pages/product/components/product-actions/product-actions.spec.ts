import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductActions } from './product-actions';

describe('ProductActions', () => {
  let component: ProductActions;
  let fixture: ComponentFixture<ProductActions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductActions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductActions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
