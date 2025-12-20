import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnifiedFeedbackModal } from './unified-feedback-modal';

describe('UnifiedFeedbackModal', () => {
  let component: UnifiedFeedbackModal;
  let fixture: ComponentFixture<UnifiedFeedbackModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnifiedFeedbackModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnifiedFeedbackModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
