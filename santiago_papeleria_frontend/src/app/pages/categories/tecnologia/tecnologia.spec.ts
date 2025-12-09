import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tecnologia } from './tecnologia';

describe('Tecnologia', () => {
  let component: Tecnologia;
  let fixture: ComponentFixture<Tecnologia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tecnologia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tecnologia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
