import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustBadges } from './trust-badges';

describe('TrustBadges', () => {
  let component: TrustBadges;
  let fixture: ComponentFixture<TrustBadges>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustBadges]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrustBadges);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
