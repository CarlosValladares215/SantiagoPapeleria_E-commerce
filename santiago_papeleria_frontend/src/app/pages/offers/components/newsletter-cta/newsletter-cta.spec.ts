import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsletterCtaComponent } from './newsletter-cta';

describe('NewsletterCta', () => {
  let component: NewsletterCtaComponent;
  let fixture: ComponentFixture<NewsletterCtaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsletterCtaComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(NewsletterCtaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
