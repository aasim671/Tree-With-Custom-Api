import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';


import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient,  withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [ provideHttpClient(withFetch()),provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideClientHydration(),
    provideAnimations(),provideAnimationsAsync(), provideHttpClient() ],

  };





