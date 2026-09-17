import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { RecordModel } from '../models/record.model';
import { OcrService } from '../services/ocr.service';


interface BackData {
  occupation?: string;
  gender?: string;
  religion?: string;
  maritalStatus?: string;
  husbandName?: string;
  expiryDate?: string;
}


export type RecordValue = (RecordModel & BackData) & {
  frontImageDataUrl?: string | null;
  backImageDataUrl?: string | null;
};


@Component({
  selector: 'app-record-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './record-form.component.html',
  styleUrls: ['./record-form.component.css'],
})
export class RecordFormComponent {

  @Input() value: Partial<RecordValue> = {};
  @Input() isEdit = false;
  @Input() existingIds: string[] = [];

  @Output() save = new EventEmitter<RecordValue>();
  @Output() cancel = new EventEmitter<void>();


  mode: 'manual' | 'upload' = 'manual';

  loadingFront = false;
  loadingBack = false;

  frontExtracted = false;
  backExtracted = false;

  step: 'front' | 'back' = 'front';

  front: {
    name?: string;
    nationalId?: string;
    address?: string;
    dob?: string;
    age?: number;
  } = {};

  back: BackData = {};

  frontFile?: File;
  backFile?: File;

  frontPreview?: string | null;
  backPreview?: string | null;

  idLocked = false;

  private frontObjUrl?: string;
  private backObjUrl?: string;

  showError = false;
  errorText = '';

  showConfirm = false;
  private pendingFrontOnly = false;

  private ocrFrontLast?: {
    name?: string;
    nationalId?: string;
    address?: string;
    dob?: string;
    age?: number;
  };

  private ocrBackLast?: BackData;

  applyFillEmptyOnly = true;


  constructor(
    private ocr: OcrService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}


  ngOnInit() {

    this.front = {
      name: this.value.name,
      nationalId: this.value.idNumber,
      address: this.value.address,
      dob: this.value.dateOfBirth,
      age: this.value.age,
    };

    this.back = {
      occupation: this.value.occupation,
      gender: this.value.gender,
      religion: this.value.religion,
      maritalStatus: this.value.maritalStatus,
      husbandName: this.value.husbandName,
      expiryDate: this.value.expiryDate,
    };

    this.frontPreview =
      (
        this.value.frontImageDataUrl ??
        this.value.imageDataUrl ??
        null
      ) || null;

    this.backPreview =
      this.value.backImageDataUrl ?? null;
  }


  // =========================================================
  // EXTENSION COMPATIBILITY
  // =========================================================

  /**
   * Reads the actual value currently displayed inside an input/textarea.
   *
   * This is important because a Chrome extension may do:
   *
   * element.value = "..."
   *
   * without Angular knowing that the value changed.
   */
  private readDomValue(id: string): string | undefined {

    if (typeof document === 'undefined') {
      return undefined;
    }

    const element = document.getElementById(id) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;

    if (!element) {
      return undefined;
    }

    return element.value ?? '';
  }


  /**
   * Synchronize values inserted by the OCR Chrome Extension
   * back into Angular front/back objects.
   */
  private syncExtensionValuesFromDom(): void {

    // ================= FRONT =================

    const name = this.readDomValue('name');
    const nationalId = this.readDomValue('nationalId');
    const address = this.readDomValue('address');
    const dob = this.readDomValue('dob');


    if (name !== undefined) {
      this.front.name = name.trim();
    }


    if (nationalId !== undefined) {

      const englishDigits =
        this.toEnglishDigits(nationalId)
          .replace(/\D/g, '');

      this.front.nationalId =
        this.toArabicDigits(englishDigits);


      // Generate DOB automatically from Egyptian ID
      // only if we don't already have a DOB field value.
      if (englishDigits.length === 14 && !dob) {

        const parsedDob =
          this.parseDobFromEgyptId(englishDigits);

        if (parsedDob) {
          this.front.dob = parsedDob;
        }
      }
    }


    if (address !== undefined) {
      this.front.address =
        this.cleanAddress(address);
    }


    if (dob !== undefined && dob.trim()) {
      this.front.dob = dob.trim();
    }


    if (this.front.dob) {
      this.recalcAge();
    }


    // ================= BACK =================

    const occupation =
      this.readDomValue('occupation');

    const gender =
      this.readDomValue('gender');

    const religion =
      this.readDomValue('religion');

    const maritalStatus =
      this.readDomValue('maritalStatus');

    const husbandName =
      this.readDomValue('husbandName');

    const expiryDate =
      this.readDomValue('expiryDate');


    if (occupation !== undefined) {
      this.back.occupation =
        this.cleanOccupation(occupation);
    }


    if (gender !== undefined) {
      this.back.gender =
        gender.trim();
    }


    if (religion !== undefined) {
      this.back.religion =
        religion.trim();
    }


    if (maritalStatus !== undefined) {
      this.back.maritalStatus =
        this.cleanMaritalStatus(maritalStatus);
    }


    if (husbandName !== undefined) {
      this.back.husbandName =
        husbandName.trim();
    }


    if (expiryDate !== undefined) {
      this.back.expiryDate =
        expiryDate.trim();
    }


    this.cdr.detectChanges();
  }


  // =========================================================
  // FORM STATE
  // =========================================================

  get frontDone(): boolean {

    if (
      this.front.name ||
      this.front.nationalId ||
      this.front.address ||
      this.front.dob
    ) {
      return true;
    }

    // Fallback for values injected directly by Chrome Extension
    return !!(
      this.readDomValue('name') ||
      this.readDomValue('nationalId') ||
      this.readDomValue('address') ||
      this.readDomValue('dob')
    );
  }


  private applyAndRefresh(mutator: () => void) {

    this.zone.run(() => {

      mutator();

      this.cdr.detectChanges();
    });
  }


  go(s: 'front' | 'back') {

    // Read extension values before changing page
    this.syncExtensionValuesFromDom();

    if (s === 'back' && !this.frontDone) {
      return;
    }

    this.step = s;
  }


  goNext() {

    // VERY IMPORTANT:
    // capture values that Chrome Extension placed in DOM
    this.syncExtensionValuesFromDom();

    this.step = 'back';
  }


  // =========================================================
  // DATE / AGE
  // =========================================================

  recalcAge() {

    if (!this.front.dob) {
      this.front.age = undefined;
      return;
    }

    const birth = new Date(this.front.dob);
    const today = new Date();

    let age =
      today.getFullYear() -
      birth.getFullYear();

    const m =
      today.getMonth() -
      birth.getMonth();

    if (
      m < 0 ||
      (
        m === 0 &&
        today.getDate() < birth.getDate()
      )
    ) {
      age--;
    }

    this.front.age =
      Math.max(0, age);
  }


  private parseDobFromEgyptId(id: string): string | null {

    const m =
      id.match(/^([23])(\d{2})(\d{2})(\d{2})/);

    if (!m) {
      return null;
    }

    const century =
      m[1] === '2'
        ? 1900
        : m[1] === '3'
          ? 2000
          : null;

    if (century == null) {
      return null;
    }

    const yy =
      parseInt(m[2], 10);

    const mm =
      parseInt(m[3], 10);

    const dd =
      parseInt(m[4], 10);


    if (
      mm < 1 ||
      mm > 12 ||
      dd < 1 ||
      dd > 31
    ) {
      return null;
    }


    return (
      `${century + yy}-` +
      `${String(mm).padStart(2, '0')}-` +
      `${String(dd).padStart(2, '0')}`
    );
  }


  onIdChanged() {

    const en =
      this.toEnglishDigits(
        this.front.nationalId ?? ''
      );

    const digits =
      en.replace(/\D/g, '');

    this.front.nationalId =
      this.toArabicDigits(digits);


    if (digits.length !== 14) {
      return;
    }


    const dob =
      this.parseDobFromEgyptId(digits);


    if (dob) {

      this.front.dob = dob;

      this.recalcAge();
    }
  }


  // =========================================================
  // OCR APPLY HELPERS
  // =========================================================

  private applyOcrFrontToForm(
    src: any,
    overwrite = false
  ) {

    if (!src) {
      return;
    }


    const set = (
      key: keyof typeof this.front,
      val: any
    ) => {

      if (overwrite) {

        (this.front as any)[key] =
          val ?? '';

      } else if (!(this.front as any)[key]) {

        (this.front as any)[key] =
          val ?? '';
      }
    };


    set('name', src.name);

    set(
      'nationalId',
      src.nationalId
    );


    const cleanedAddress =
      this.cleanAddress(src.address);

    set(
      'address',
      cleanedAddress
    );


    set(
      'dob',
      src.dob
    );


    if (typeof src.age === 'number') {

      if (
        overwrite ||
        this.front.age == null
      ) {
        this.front.age = src.age;
      }
    }
  }


  private applyOcrBackToForm(
    src: BackData,
    overwrite = false
  ) {

    if (!src) {
      return;
    }


    const set = (
      key: keyof BackData,
      val: any
    ) => {

      if (overwrite) {

        (this.back as any)[key] =
          val ?? '';

      } else if (!(this.back as any)[key]) {

        (this.back as any)[key] =
          val ?? '';
      }
    };


    set(
      'occupation',
      src.occupation
    );

    set(
      'gender',
      src.gender
    );

    set(
      'religion',
      src.religion
    );

    set(
      'maritalStatus',
      src.maritalStatus
    );

    set(
      'husbandName',
      src.husbandName
    );

    set(
      'expiryDate',
      src.expiryDate
    );
  }


  // =========================================================
  // FILE SELECTION
  // =========================================================

  onFrontSelected(ev: Event) {

    const input =
      ev.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }


    if (!file.type.startsWith('image/')) {

      this.openError(
        'Please select an image file.'
      );

      return;
    }


    if (this.frontObjUrl) {
      URL.revokeObjectURL(
        this.frontObjUrl
      );
    }


    this.frontObjUrl =
      URL.createObjectURL(file);

    this.frontFile = file;

    this.frontPreview =
      this.frontObjUrl;

    this.frontExtracted = false;
  }


  onBackSelected(ev: Event) {

    const input =
      ev.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }


    if (!file.type.startsWith('image/')) {

      this.openError(
        'Please select an image file.'
      );

      return;
    }


    if (this.backObjUrl) {

      URL.revokeObjectURL(
        this.backObjUrl
      );
    }


    this.backObjUrl =
      URL.createObjectURL(file);

    this.backFile = file;

    this.backPreview =
      this.backObjUrl;

    this.backExtracted = false;
  }


  clearFront(e: Event) {

    e.preventDefault();


    if (this.frontObjUrl) {

      URL.revokeObjectURL(
        this.frontObjUrl
      );
    }


    this.frontObjUrl = undefined;

    this.frontFile = undefined;

    this.frontPreview = null;

    this.frontExtracted = false;
  }


  clearBack(e: Event) {

    e.preventDefault();


    if (this.backObjUrl) {

      URL.revokeObjectURL(
        this.backObjUrl
      );
    }


    this.backObjUrl = undefined;

    this.backFile = undefined;

    this.backPreview = null;

    this.backExtracted = false;
  }


  // =========================================================
  // FRONT OCR
  // =========================================================

  extractFront() {

    if (
      this.isEdit ||
      this.mode === 'manual'
    ) {
      return;
    }


    if (!this.frontFile) {

      this.openError(
        'Please upload the front image first.'
      );

      return;
    }


    this.loadingFront = true;


    this.ocr
      .extractFront(
        this.frontFile,
        120
      )
      .pipe(
        finalize(() => {

          this.loadingFront = false;

          this.cdr.detectChanges();
        })
      )
      .subscribe({

        next: (res: any) => {

          if (
            this.looksLikeBackOcr(res)
          ) {

            this.openError(
              'This image appears to be the BACK side, not the FRONT.'
            );

            this.clearFront(
              new Event('clear')
            );

            return;
          }


          const r =
            res?.data ?? res;


          this.applyAndRefresh(() => {

            // Supports both normalized Angular response
            // and raw Python response:
            //
            // nationalId / idNumber / ID

            const rawId =
              r?.nationalId ??
              r?.idNumber ??
              r?.ID ??
              '';


            const arabicId =
              this.toArabicDigits(
                String(rawId)
              );


            this.ocrFrontLast = {

              name:
                r?.name ??
                r?.Name ??
                '',

              nationalId:
                arabicId,

              address:
                r?.address ??
                r?.Address ??
                '',

              dob:
                r?.dob ??
                r?.DOB ??
                r?.dateOfBirth ??
                '',

              age:
                typeof r?.age === 'number'
                  ? r.age
                  : undefined
            };


            this.applyOcrFrontToForm(
              this.ocrFrontLast,
              !this.applyFillEmptyOnly
            );


            if (
              this.ocrFrontLast.nationalId
            ) {
              this.idLocked = true;
            }


            if (!this.front.age) {
              this.recalcAge();
            }
          });
        },


        error: _ =>
          this.openError(
            'Front OCR failed.'
          )
      });
  }


  // =========================================================
  // BACK OCR
  // =========================================================

  extractBack() {

    if (
      this.isEdit ||
      this.mode === 'manual'
    ) {
      return;
    }


    if (!this.backFile) {

      this.openError(
        'Please upload the back image first.'
      );

      return;
    }


    this.loadingBack = true;


    this.ocr
      .extractBack(this.backFile)
      .pipe(
        finalize(() => {

          this.loadingBack = false;

          this.cdr.detectChanges();
        })
      )
      .subscribe({

        next: (res: any) => {

          const r =
            res?.data ?? res;


          // ===============================
          // OCCUPATION / PROFESSION
          // ===============================

          let occ =

            r?.occupation ??
            r?.Occupation ??

            r?.profession ??
            r?.Profession ??

            r?.proffession ??
            r?.Proffession ??

            r?.job ??
            r?.Job ??

            r?.jobTitle ??
            r?.JobTitle;


          if (
            typeof occ === 'string' &&
            /\|/.test(occ)
          ) {

            occ =
              occ
                .replace(/\|/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
          }


          // ===============================
          // MARITAL STATUS
          // ===============================

          let marital =

            r?.maritalStatus ??
            r?.MaritalStatus ??

            r?.marital_status ??

            r?.marital ??
            r?.Marital ??

            r?.status ??
            r?.Status ??

            r?.socialStatus ??
            r?.SocialStatus;


          if (
            typeof marital === 'string'
          ) {

            marital =
              this.cleanMaritalStatus(
                marital
              );
          }


          this.applyAndRefresh(() => {

            this.ocrBackLast = {

              occupation:
                occ,

              gender:
                r?.gender ??
                r?.Gender,

              religion:
                r?.religion ??
                r?.Religion,

              maritalStatus:
                marital,

              husbandName:
                r?.husbandName ??
                r?.husband_name ??
                r?.HusbandName,

              expiryDate:
                r?.expiryDate ??
                r?.endDate ??
                r?.enddate ??
                r?.EndDate
            };


            this.applyOcrBackToForm(
              this.ocrBackLast,
              !this.applyFillEmptyOnly
            );
          });
        },


        error: _ =>
          this.openError(
            'Back OCR failed. Please try again.'
          )
      });
  }


  // =========================================================
  // CLEANERS
  // =========================================================

  private cleanAddress(
    input?: string
  ): string {

    if (!input) {
      return '';
    }


    let s = input;


    s =
      s.replace(
        /[|_*~^]+/g,
        ' '
      );


    s =
      s.replace(
        /[\u0640]+/g,
        ' '
      );


    s = s
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى|ی/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي');


    s =
      s.replace(
        /[،,.]+/g,
        ', '
      );


    s =
      s
        .replace(/\s+/g, ' ')
        .trim();


    return s;
  }


  private cleanMaritalStatus(
    input?: string
  ): string {

    if (!input) {
      return '';
    }


    let s =
      input.trim();


    s =
      s
        .replace(
          /[|_*~^+\-=0-9٠-٩۰-۹]+/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        )
        .trim();


    const lower =
      s.toLocaleLowerCase('ar');


    if (/اعزب|عزب/.test(lower)) {
      return 'أعزب';
    }

    if (
      /متزوج|متزوجه|متزوجة/.test(lower)
    ) {
      return 'متزوج';
    }

    if (
      /مطلقة|مطلق/.test(lower)
    ) {
      return 'مطلق';
    }

    if (
      /ارملة|أرملة|ارمل|أرمل/.test(lower)
    ) {
      return 'أرمل';
    }


    return s;
  }


  private cleanOccupation(
    input?: string
  ): string {

    if (!input) {
      return '';
    }


    let s = input;


    s =
      s.replace(
        /[|_*~^+\-=]+/g,
        ' '
      );


    s =
      s.replace(
        /[\u0640]+/g,
        ' '
      );


    s =
      s.replace(
        /[0-9٠-٩۰-۹]+/g,
        ' '
      );


    s =
      s.replace(
        /^[^ء-يA-Za-z]+/,
        ''
      );


    s =
      s.replace(
        /[^ء-يA-Za-z]+$/,
        ''
      );


    s =
      s
        .replace(/\s+/g, ' ')
        .trim();


    return s;
  }


  onOccupationBlur() {

    this.back.occupation =
      this.cleanOccupation(
        this.back.occupation
      );
  }


  // =========================================================
  // NUMBER CONVERSION
  // =========================================================

  private toEnglishDigits(
    s: string
  ): string {

    const map:
      Record<string, string> = {

      '٠': '0',
      '١': '1',
      '٢': '2',
      '٣': '3',
      '٤': '4',
      '٥': '5',
      '٦': '6',
      '٧': '7',
      '٨': '8',
      '٩': '9',

      '۰': '0',
      '۱': '1',
      '۲': '2',
      '۳': '3',
      '۴': '4',
      '۵': '5',
      '۶': '6',
      '۷': '7',
      '۸': '8',
      '۹': '9'
    };


    return (
      s ?? ''
    ).replace(
      /[٠-٩۰-۹]/g,
      d => map[d] ?? d
    );
  }


  private toArabicDigits(
    s: string
  ): string {

    const arabicDigits =
      '٠١٢٣٤٥٦٧٨٩';


    return (
      s ?? ''
    ).replace(
      /\d/g,
      d => arabicDigits[+d]
    );
  }


  // =========================================================
  // OCR SIDE CHECKS
  // =========================================================

  private looksLikeBackOcr(
    res: any
  ): boolean {

    const r =
      res?.data ?? res;


    console.log(
      'BACK OCR RAW:',
      r
    );


    return !!(

      r?.occupation ||

      r?.Occupation ||

      r?.profession ||

      r?.Profession ||

      r?.proffession ||

      r?.Proffession ||

      r?.job ||

      r?.Job ||

      r?.jobTitle ||

      r?.JobTitle ||

      r?.gender ||

      r?.religion ||

      r?.maritalStatus ||

      r?.marital_status ||

      r?.husbandName ||

      r?.husband_name ||

      r?.expiryDate ||

      r?.enddate
    );
  }


  private looksLikeFrontOcr(
    res: any
  ): boolean {

    const r =
      res?.data ?? res;


    return !!(

      r?.name ||

      r?.Name ||

      r?.nationalId ||

      r?.idNumber ||

      r?.ID ||

      r?.address ||

      r?.dob ||

      r?.DOB ||

      r?.dateOfBirth
    );
  }


  // =========================================================
  // SAVE
  // =========================================================

  saveNow(
    frontOnly: boolean
  ) {

    // Pull extension values first
    this.syncExtensionValuesFromDom();


    if (
      !this.front.name?.trim() &&
      !this.front.nationalId?.trim()
    ) {

      this.openError(
        'Please provide at least a Name or National ID on the front.'
      );

      return;
    }


    this.pendingFrontOnly =
      frontOnly;

    this.showConfirm = true;
  }


  confirmSave() {

    // CRITICAL:
    // synchronize values injected by Chrome Extension
    this.syncExtensionValuesFromDom();


    this.showConfirm = false;


    const idEn =
      this.toEnglishDigits(
        this.front.nationalId ?? ''
      )
        .replace(/\D/g, '');


    if (idEn.length !== 14) {

      this.openError(
        'ID number must be 14 digits'
      );

      return;
    }


    if (this.back.occupation) {

      this.back.occupation =
        this.cleanOccupation(
          this.back.occupation
        );
    }


    const payload: any = {

      name:
        this.front.name ?? '',

      idNumber:
        idEn,

      nationalId:
        idEn,

      address:
        this.front.address ?? '',

      dateOfBirth:
        this.front.dob ?? '',

      age:
        this.front.age ?? 0,

      ...this.back,

      frontFile:
        this.isEdit
          ? null
          : (
            this.frontFile ??
            null
          ),

      backFile:
        this.isEdit
          ? null
          : (
            this.backFile ??
            null
          ),
    };


    console.log(
      'EMIT payload:',
      payload
    );


    this.save.emit(payload);
  }


  // =========================================================
  // VALIDATION / UI
  // =========================================================

  validateIdNumber(): boolean {

    const idEn =
      this.toEnglishDigits(
        this.front.nationalId ?? ''
      )
        .replace(/\D/g, '');


    return idEn.length === 14;
  }


  get dobIsIso(): boolean {

    return /^\d{4}-\d{2}-\d{2}$/
      .test(
        this.front.dob ?? ''
      );
  }


  hasArabic(
    s?: string
  ): boolean {

    return /[\u0590-\u08FF]/
      .test(
        s ?? ''
      );
  }


  cancelSave() {
    this.showConfirm = false;
  }


  openError(
    msg: string
  ) {

    this.errorText = msg;
    this.showError = true;
  }


  closeError() {
    this.showError = false;
  }


  onCancel() {
    this.cancel.emit();
  }


  ngOnDestroy() {

    if (this.frontObjUrl) {

      URL.revokeObjectURL(
        this.frontObjUrl
      );
    }


    if (this.backObjUrl) {

      URL.revokeObjectURL(
        this.backObjUrl
      );
    }
  }
}