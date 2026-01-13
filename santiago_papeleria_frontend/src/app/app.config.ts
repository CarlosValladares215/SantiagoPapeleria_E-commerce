import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { LucideAngularModule, University, Plus, Pencil, Trash2, Banknote, Store, Info, Save, MessageCircle, X, Send, Minimize2, Settings, Map, Upload, MapPin, Check, CloudUpload, FileSpreadsheet, Globe, Infinity, Edit2 } from 'lucide-angular';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables()),
    importProvidersFrom(LucideAngularModule.pick({ MessageCircle, X, Send, Minimize2, Settings, Map, Upload, MapPin, Check, CloudUpload, FileSpreadsheet, Globe, Infinity })),
    importProvidersFrom(LucideAngularModule.pick({ University, Plus, Pencil, Trash2, Banknote, Store, Info, Save, Edit2 }))
  ]
};
