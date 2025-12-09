import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArteManualidades } from './arte-manualidades';

describe('ArteManualidades', () => {
  let component: ArteManualidades;
  let fixture: ComponentFixture<ArteManualidades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArteManualidades]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArteManualidades);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
