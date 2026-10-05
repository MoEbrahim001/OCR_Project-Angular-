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

  // =========================================================
  // INPUTS / OUTPUTS
  // =========================================================

  @Input() value: Partial<RecordValue> = {};

  @Input() isEdit = false;

  @Input() existingIds: string[] = [];


  @Output() save = new EventEmitter<RecordValue>();

  @Output() cancel = new EventEmitter<void>();


  // =========================================================
  // FRONT DATA
  // =========================================================

  front: {
    name?: string;
    nationalId?: string;
    address?: string;
    dob?: string;
    age?: number;
  } = {};


  // =========================================================
  // BACK DATA
  // =========================================================

  back: BackData = {};


  // =========================================================
  // IMAGE UPLOADS
  // =========================================================

  frontFile: File | null = null;

  backFile: File | null = null;


  frontPreview: string | null = null;

  backPreview: string | null = null;


  loadingFront = false;

  loadingBack = false;


  // =========================================================
  // UI
  // =========================================================

  idLocked = false;


  showError = false;

  errorText = '';


  showConfirm = false;


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private ocr: OcrService,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    this.front = {

      name:
        this.value.name,

      nationalId:
        this.value.idNumber,

      address:
        this.value.address,

      dob:
        this.value.dateOfBirth,

      age:
        this.value.age

    };


    this.back = {

      occupation:
        this.value.occupation,

      gender:
        this.value.gender,

      religion:
        this.value.religion,

      maritalStatus:
        this.value.maritalStatus,

      husbandName:
        this.value.husbandName,

      expiryDate:
        this.value.expiryDate

    };


    // Existing previews when editing
    this.frontPreview =
      this.value.frontImageDataUrl ?? null;

    this.backPreview =
      this.value.backImageDataUrl ?? null;


    if (this.front.dob) {

      this.recalcAge();

    }

  }


  // =========================================================
  // FRONT IMAGE
  // =========================================================

  onFrontFileSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    const file =
      input.files?.[0];


    if (!file) {

      return;

    }


    if (!this.isValidImage(file)) {

      this.openError(
        'Please select a JPG, JPEG or PNG image.'
      );

      input.value = '';

      return;

    }


    this.frontFile = file;


    // -------------------------
    // Preview
    // -------------------------

    this.createPreview(
      file,
      preview => {

        this.frontPreview = preview;

        this.cdr.detectChanges();

      }
    );


    // -------------------------
    // OCR
    // -------------------------

    this.loadingFront = true;


    this.ocr
      .extractFront(file)
      .pipe(

        finalize(() => {

          this.loadingFront = false;

          this.cdr.detectChanges();

        })

      )
      .subscribe({

        next: result => {

          const data: any = result;


          // Name
          this.front.name =
            data.name
            ?? data.fullName
            ?? '';


          // National ID
          const rawId =
            data.nationalId
            ?? data.idNumber
            ?? data.ID
            ?? data.id
            ?? data.nid
            ?? '';


          if (rawId) {

            const englishDigits =
              this.toEnglishDigits(
                String(rawId)
              )
                .replace(/\D/g, '');


            this.front.nationalId =
              this.toArabicDigits(
                englishDigits
              );


            this.onIdChanged();

          }


          // Address
          const address =
            data.address
            ?? '';


          this.front.address =
            this.cleanAddress(
              String(address)
            );


          // DOB
          const dob =
            data.dob
            ?? data.dateOfBirth
            ?? data.DOB
            ?? null;


          if (dob) {

            this.front.dob =
              String(dob);

          }


          // If DOB is not returned,
          // derive it from National ID
          if (
            !this.front.dob &&
            this.front.nationalId
          ) {

            const id =
              this.toEnglishDigits(
                this.front.nationalId
              )
                .replace(/\D/g, '');


            const parsedDob =
              this.parseDobFromEgyptId(id);


            if (parsedDob) {

              this.front.dob =
                parsedDob;

            }

          }


          this.recalcAge();

          this.cdr.detectChanges();

        },


        error: error => {

          console.error(
            'Front OCR error:',
            error
          );


          this.openError(
            this.getOcrErrorMessage(
              error,
              'Front'
            )
          );

        }

      });

  }


  // =========================================================
  // BACK IMAGE
  // =========================================================

  onBackFileSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    const file =
      input.files?.[0];


    if (!file) {

      return;

    }


    if (!this.isValidImage(file)) {

      this.openError(
        'Please select a JPG, JPEG or PNG image.'
      );

      input.value = '';

      return;

    }


    this.backFile = file;


    // -------------------------
    // Preview
    // -------------------------

    this.createPreview(
      file,
      preview => {

        this.backPreview = preview;

        this.cdr.detectChanges();

      }
    );


    // -------------------------
    // OCR
    // -------------------------

    this.loadingBack = true;


    this.ocr
      .extractBack(file)
      .pipe(

        finalize(() => {

          this.loadingBack = false;

          this.cdr.detectChanges();

        })

      )
      .subscribe({

        next: result => {

          const data: any = result;


          // Occupation / Profession
          this.back.occupation =
            this.cleanOccupation(

              data.occupation
              ?? data.profession
              ?? data.proffession
              ?? data.job
              ?? ''

            );


          // Gender
          this.back.gender =
            String(
              data.gender
              ?? ''
            ).trim();


          // Religion
          this.back.religion =
            String(
              data.religion
              ?? ''
            ).trim();


          // Marital Status
          this.back.maritalStatus =
            this.cleanMaritalStatus(

              data.maritalStatus
              ?? data.marital_status
              ?? data.marital
              ?? ''

            );


          // Husband Name
          this.back.husbandName =
            String(

              data.husbandName
              ?? data.husband_name
              ?? data.husband
              ?? ''

            ).trim();


          // Expiry Date
          this.back.expiryDate =
            String(

              data.expiryDate
              ?? data.endDate
              ?? data.enddate
              ?? data.expiry
              ?? ''

            ).trim();


          this.cdr.detectChanges();

        },


        error: error => {

          console.error(
            'Back OCR error:',
            error
          );


          this.openError(
            this.getOcrErrorMessage(
              error,
              'Back'
            )
          );

        }

      });

  }


  // =========================================================
  // IMAGE HELPERS
  // =========================================================

  private isValidImage(
    file: File
  ): boolean {

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];


    return allowedTypes.includes(
      file.type.toLowerCase()
    );

  }


  private createPreview(
    file: File,
    callback: (value: string) => void
  ): void {

    const reader =
      new FileReader();


    reader.onload = () => {

      callback(
        reader.result as string
      );

    };


    reader.onerror = () => {

      this.openError(
        'Could not preview the selected image.'
      );

    };


    reader.readAsDataURL(file);

  }


  private getOcrErrorMessage(
    error: any,
    side: string
  ): string {

    if (
      error?.status === 0
    ) {

      return (
        `${side} OCR service could not be reached. ` +
        `Make sure the .NET API and Python OCR service are running.`
      );

    }


    if (
      error?.status >= 500
    ) {

      return (
        `${side} OCR failed on the server. ` +
        `Please try again.`
      );

    }


    return (
      `${side} OCR failed. ` +
      `Please check the selected image and try again.`
    );

  }


  // =========================================================
  // DATE / AGE
  // =========================================================

  recalcAge(): void {

    if (!this.front.dob) {

      this.front.age =
        undefined;

      return;

    }


    const birth =
      new Date(
        this.front.dob
      );


    if (
      Number.isNaN(
        birth.getTime()
      )
    ) {

      this.front.age =
        undefined;

      return;

    }


    const today =
      new Date();


    let age =
      today.getFullYear()
      -
      birth.getFullYear();


    const monthDifference =
      today.getMonth()
      -
      birth.getMonth();


    if (
      monthDifference < 0
      ||
      (
        monthDifference === 0
        &&
        today.getDate()
        <
        birth.getDate()
      )
    ) {

      age--;

    }


    this.front.age =
      Math.max(
        0,
        age
      );

  }


  private parseDobFromEgyptId(
    id: string
  ): string | null {

    const match =
      id.match(
        /^([23])(\d{2})(\d{2})(\d{2})/
      );


    if (!match) {

      return null;

    }


    const century =
      match[1] === '2'
        ? 1900
        : match[1] === '3'
          ? 2000
          : null;


    if (century === null) {

      return null;

    }


    const year =
      century
      +
      parseInt(
        match[2],
        10
      );


    const month =
      parseInt(
        match[3],
        10
      );


    const day =
      parseInt(
        match[4],
        10
      );


    if (
      month < 1
      ||
      month > 12
      ||
      day < 1
      ||
      day > 31
    ) {

      return null;

    }


    const result =
      `${year}-` +
      `${String(month).padStart(2, '0')}-` +
      `${String(day).padStart(2, '0')}`;


    const parsed =
      new Date(result);


    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {

      return null;

    }


    // Make sure JS did not normalize an invalid date
    if (
      parsed.getFullYear() !== year
      ||
      parsed.getMonth() + 1 !== month
      ||
      parsed.getDate() !== day
    ) {

      return null;

    }


    return result;

  }


  onIdChanged(): void {

    const english =
      this.toEnglishDigits(
        this.front.nationalId
        ?? ''
      );


    const digits =
      english.replace(
        /\D/g,
        ''
      );


    this.front.nationalId =
      this.toArabicDigits(
        digits
      );


    if (
      digits.length !== 14
    ) {

      this.front.dob =
        undefined;

      this.front.age =
        undefined;

      return;

    }


    const dob =
      this.parseDobFromEgyptId(
        digits
      );


    if (dob) {

      this.front.dob =
        dob;


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


    let value =
      input;


    value =
      value.replace(
        /[|_*~^]+/g,
        ' '
      );


    value =
      value.replace(
        /[\u0640]+/g,
        ' '
      );


    value =
      value.replace(
        /[،,.]+/g,
        ', '
      );


    value =
      value
        .replace(
          /\s+/g,
          ' '
        )
        .trim();


    return value;

  }


  private cleanMaritalStatus(
    input?: string
  ): string {

    if (!input) {

      return '';

    }


    let value =
      input.trim();


    value =
      value
        .replace(
          /[|_*~^+\\\-=0-9٠-٩۰-۹]+/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        )
        .trim();


    const normalized =
      value
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .toLocaleLowerCase('ar');


    if (
      /اعزب|عزب/.test(
        normalized
      )
    ) {

      return 'أعزب';

    }


    if (
      /متزوج|متزوجه/.test(
        normalized
      )
    ) {

      return 'متزوج';

    }


    if (
      /مطلق|مطلقه/.test(
        normalized
      )
    ) {

      return 'مطلق';

    }


    if (
      /ارمل|ارمله/.test(
        normalized
      )
    ) {

      return 'أرمل';

    }


    return value;

  }


  private cleanOccupation(
    input?: string
  ): string {

    if (!input) {

      return '';

    }


    let value =
      String(input);


    value =
      value.replace(
        /[|_*~^+\\\-=]+/g,
        ' '
      );


    value =
      value.replace(
        /[\u0640]+/g,
        ' '
      );


    value =
      value.replace(
        /[0-9٠-٩۰-۹]+/g,
        ' '
      );


    value =
      value.replace(
        /^[^ء-يA-Za-z]+/,
        ''
      );


    value =
      value.replace(
        /[^ء-يA-Za-z]+$/,
        ''
      );


    value =
      value
        .replace(
          /\s+/g,
          ' '
        )
        .trim();


    return value;

  }


  onOccupationBlur(): void {

    this.back.occupation =
      this.cleanOccupation(
        this.back.occupation
      );

  }


  // =========================================================
  // NUMBER CONVERSION
  // =========================================================

  private toEnglishDigits(
    value: string
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
      value
      ?? ''
    )
      .replace(
        /[٠-٩۰-۹]/g,
        digit =>
          map[digit]
          ?? digit
      );

  }


  private toArabicDigits(
    value: string
  ): string {

    const arabicDigits =
      '٠١٢٣٤٥٦٧٨٩';


    return (
      value
      ?? ''
    )
      .replace(
        /\d/g,
        digit =>
          arabicDigits[
            Number(digit)
          ]
      );

  }


  // =========================================================
  // SAVE
  // =========================================================

  saveNow(
    _frontOnly: boolean
  ): void {

    if (
      this.loadingFront
      ||
      this.loadingBack
    ) {

      this.openError(
        'Please wait until OCR processing is complete.'
      );

      return;

    }


    if (
      !this.front.name?.trim()
      &&
      !this.front.nationalId?.trim()
    ) {

      this.openError(
        'Please provide at least a Name or National ID.'
      );

      return;

    }


    this.showConfirm =
      true;

  }


  confirmSave(): void {

    this.showConfirm =
      false;


    const idEnglish =
      this.toEnglishDigits(
        this.front.nationalId
        ?? ''
      )
        .replace(
          /\D/g,
          ''
        );


    if (
      idEnglish.length !== 14
    ) {

      this.openError(
        'ID number must be 14 digits.'
      );

      return;

    }


    if (
      this.back.occupation
    ) {

      this.back.occupation =
        this.cleanOccupation(
          this.back.occupation
        );

    }


    const payload: any = {

      name:
        this.front.name
        ?? '',


      idNumber:
        idEnglish,


      nationalId:
        idEnglish,


      address:
        this.front.address
        ?? '',


      dateOfBirth:
        this.front.dob
        ?? null,


      age:
        this.front.age
        ?? 0,


      occupation:
        this.back.occupation
        ?? '',


      gender:
        this.back.gender
        ?? '',


      religion:
        this.back.religion
        ?? '',


      maritalStatus:
        this.back.maritalStatus
        ?? '',


      husbandName:
        this.back.husbandName
        ?? '',


      expiryDate:
        this.back.expiryDate
        ?? null,


      frontImageDataUrl:
        this.frontPreview,


      backImageDataUrl:
        this.backPreview

    };


    console.log(
      'SAVE RECORD PAYLOAD:',
      payload
    );


    this.save.emit(
      payload as RecordValue
    );

  }


  // =========================================================
  // VALIDATION
  // =========================================================

  validateIdNumber(): boolean {

    const idEnglish =
      this.toEnglishDigits(
        this.front.nationalId
        ?? ''
      )
        .replace(
          /\D/g,
          ''
        );


    return (
      idEnglish.length === 14
    );

  }


  get dobIsIso(): boolean {

    return (
      /^\d{4}-\d{2}-\d{2}$/
        .test(
          this.front.dob
          ?? ''
        )
    );

  }


  hasArabic(
    value?: string
  ): boolean {

    return (
      /[\u0590-\u08FF]/
        .test(
          value
          ?? ''
        )
    );

  }


  // =========================================================
  // MODALS / CANCEL
  // =========================================================

  cancelSave(): void {

    this.showConfirm =
      false;

  }


  openError(
    message: string
  ): void {

    this.errorText =
      message;


    this.showError =
      true;

  }


  closeError(): void {

    this.showError =
      false;

  }


  onCancel(): void {

    this.cancel.emit();

  }

}