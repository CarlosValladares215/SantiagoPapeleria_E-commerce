import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalsSummary } from './totals-summary';

describe('TotalsSummary', () => {
  let component: TotalsSummary;
  let fixture: ComponentFixture<TotalsSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TotalsSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TotalsSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
