import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sucursales } from './sucursales';

describe('Sucursales', () => {
  let component: Sucursales;
  let fixture: ComponentFixture<Sucursales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sucursales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sucursales);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
