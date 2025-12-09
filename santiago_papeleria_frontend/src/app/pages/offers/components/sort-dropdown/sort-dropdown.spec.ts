import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SortDropdownComponent } from './sort-dropdown';

describe('SortDropdown', () => {
  let component: SortDropdownComponent;
  let fixture: ComponentFixture<SortDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SortDropdownComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SortDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
