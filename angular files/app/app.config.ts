
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';

// ✅ correct imports for v17
import {  provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
 //   provideAnimations(),
    provideRouter(routes),

   
    // ONE place to configure everything:
    provideTranslateService({
      // HTTP loader
      loader: provideTranslateHttpLoader({
        // use a relative prefix so it also works under sub-paths
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
      // language settings
      fallbackLang: 'ar',   // replaces deprecated defaultLanguage/useDefaultLang
      lang: 'ar',           // the initial active language
    }),
  ],
};
