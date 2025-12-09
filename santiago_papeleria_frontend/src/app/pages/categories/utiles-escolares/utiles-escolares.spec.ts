import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilesEscolares } from './utiles-escolares';

describe('UtilesEscolares', () => {
  let component: UtilesEscolares;
  let fixture: ComponentFixture<UtilesEscolares>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UtilesEscolares]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilesEscolares);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
