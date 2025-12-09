import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsletterSection } from './newsletter-section';

describe('NewsletterSection', () => {
  let component: NewsletterSection;
  let fixture: ComponentFixture<NewsletterSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsletterSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsletterSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
