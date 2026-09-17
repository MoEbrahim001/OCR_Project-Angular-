import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { RecordModel } from '../models/record.model';


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


  front: {
    name?: string;
    nationalId?: string;
    address?: string;
    dob?: string;
    age?: number;
  } = {};

  back: BackData = {};

  // Kept for compatibility with the existing template.
  // In the new Extension flow the ID is not locked by Angular OCR.
  idLocked = false;

  showError = false;
  errorText = '';

  showConfirm = false;


  constructor(
    private cdr: ChangeDetectorRef
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
  }


  // =========================================================
  // EXTENSION COMPATIBILITY
  // =========================================================

  /**
   * Reads the real value currently displayed in an input/textarea.
   *
   * The Chrome extension may inject values directly into the DOM.
   * This method lets Angular pull those values back into its model
   * before saving.
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
   * Pull values inserted by the OCR Chrome Extension into Angular state.
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

      // If the extension filled a valid Egyptian ID but did not fill DOB,
      // derive DOB from the ID automatically.
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
  // DATE / AGE
  // =========================================================

  recalcAge() {

    if (!this.front.dob) {
      this.front.age = undefined;
      return;
    }

    const birth = new Date(this.front.dob);

    if (Number.isNaN(birth.getTime())) {
      this.front.age = undefined;
      return;
    }

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

    const result =
      `${century + yy}-` +
      `${String(mm).padStart(2, '0')}-` +
      `${String(dd).padStart(2, '0')}`;

    const parsed = new Date(result);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return result;
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
  // SAVE
  // =========================================================

  saveNow(
    _frontOnly: boolean
  ) {

    // Pull extension values into Angular first.
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

    this.showConfirm = true;
  }


  confirmSave() {

    // Pull extension values one last time before emitting the payload.
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
}
