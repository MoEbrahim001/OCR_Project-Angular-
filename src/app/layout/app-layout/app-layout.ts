import {
  CommonModule
} from '@angular/common';

import {
  Component
} from '@angular/core';

import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import {
  TranslateModule,
  TranslateService
} from '@ngx-translate/core';


@Component({
  selector: 'app-app-layout',

  standalone: true,

  imports: [
    CommonModule,
    TranslateModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],

  templateUrl:
    './app-layout.html',

  styleUrl:
    './app-layout.css'
})
export class AppLayout {

  currentLang:
    'en' | 'ar' = 'en';


  constructor(
    private translate:
      TranslateService
  ) {

    const saved =
      (
        typeof window !== 'undefined'
        &&
        localStorage.getItem('lang')
      ) as 'en' | 'ar' | null;


    this.currentLang =
      saved ?? 'en';


    this.translate.use(
      this.currentLang
    );


    this.applyDir(
      this.currentLang
    );
  }


  switchLang(): void {

    this.currentLang =
      this.currentLang === 'en'
        ? 'ar'
        : 'en';


    this.translate.use(
      this.currentLang
    );


    if (
      typeof window !== 'undefined'
    ) {

      localStorage.setItem(
        'lang',
        this.currentLang
      );
    }


    this.applyDir(
      this.currentLang
    );
  }


  private applyDir(
    lang:
      'en' | 'ar'
  ): void {

    if (
      typeof document === 'undefined'
    ) {
      return;
    }


    document.documentElement.dir =
      lang === 'ar'
        ? 'rtl'
        : 'ltr';


    document.documentElement.lang =
      lang;
  }
}