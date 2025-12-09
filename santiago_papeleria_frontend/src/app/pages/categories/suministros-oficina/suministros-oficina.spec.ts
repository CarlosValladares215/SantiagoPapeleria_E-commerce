import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuministrosOficina } from './suministros-oficina';

describe('SuministrosOficina', () => {
  let component: SuministrosOficina;
  let fixture: ComponentFixture<SuministrosOficina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuministrosOficina]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuministrosOficina);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
