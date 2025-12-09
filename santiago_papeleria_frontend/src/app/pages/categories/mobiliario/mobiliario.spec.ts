import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mobiliario } from './mobiliario';

describe('Mobiliario', () => {
  let component: Mobiliario;
  let fixture: ComponentFixture<Mobiliario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mobiliario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mobiliario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
