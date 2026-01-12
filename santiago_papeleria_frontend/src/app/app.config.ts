import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { routes } from './app.routes';
import { LucideAngularModule, MessageCircle, X, Send, Minimize2 } from 'lucide-angular';
import { importProvidersFrom } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables()),
    importProvidersFrom(LucideAngularModule.pick({ MessageCircle, X, Send, Minimize2 }))
  ]
};
