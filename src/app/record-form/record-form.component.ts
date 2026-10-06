import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild
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
  styleUrls: ['./record-form.component.css']
})
export class RecordFormComponent implements OnDestroy {

  // =========================================================
  // INPUTS / OUTPUTS
  // =========================================================

  @Input() value: Partial<RecordValue> = {};

  @Input() isEdit = false;

  @Input() existingIds: string[] = [];


  @Output() save =
    new EventEmitter<RecordValue>();

  @Output() cancel =
    new EventEmitter<void>();


  // =========================================================
  // FRONT
  // =========================================================

  front: {
    name?: string;
    nationalId?: string;
    address?: string;
    dob?: string;
    age?: number;
  } = {};


  // =========================================================
  // BACK
  // =========================================================

  back: BackData = {};


  // =========================================================
  // FILES / PREVIEWS
  // =========================================================

  frontFile: File | null = null;

  backFile: File | null = null;


  frontPreview: string | null = null;

  backPreview: string | null = null;


  loadingFront = false;

  loadingBack = false;


  // =========================================================
  // CAMERA
  // =========================================================

  @ViewChild('cameraVideo')
  cameraVideo?: ElementRef<HTMLVideoElement>;


  showCamera = false;

  cameraLoading = false;


  cameraTarget:
    'front' | 'back' = 'front';


  cameraDevices:
    MediaDeviceInfo[] = [];


  selectedCameraId = '';


  cameraStream:
    MediaStream | null = null;


  cameraError = '';


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


    this.frontPreview =
      this.value.frontImageDataUrl
      ?? null;


    this.backPreview =
      this.value.backImageDataUrl
      ?? null;


    if (this.front.dob) {

      this.recalcAge();

    }
  }


  // =========================================================
  // FRONT FILE UPLOAD
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


    this.processFrontFile(file);


    // Allows selecting the same file again
    input.value = '';
  }


  // =========================================================
  // BACK FILE UPLOAD
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


    this.processBackFile(file);


    input.value = '';
  }


  // =========================================================
  // PROCESS FRONT
  // =========================================================

  private processFrontFile(
    file: File
  ): void {

    this.frontFile = file;


    this.createPreview(
      file,
      preview => {

        this.frontPreview =
          preview;

        this.cdr.detectChanges();
      }
    );


    this.loadingFront = true;


    this.ocr
      .extractFront(file)
      .pipe(

        finalize(() => {

          this.loadingFront =
            false;

          this.cdr.detectChanges();
        })

      )
      .subscribe({

        next: result => {

          const data: any =
            result;


          // -------------------------
          // NAME
          // -------------------------

          this.front.name =

            data.name
            ?? data.fullName
            ?? '';


          // -------------------------
          // NATIONAL ID
          // -------------------------

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
                .replace(
                  /\D/g,
                  ''
                );


            this.front.nationalId =

              this.toArabicDigits(
                englishDigits
              );


            this.onIdChanged();
          }


          // -------------------------
          // ADDRESS
          // -------------------------

          this.front.address =

            this.cleanAddress(

              String(
                data.address
                ?? ''
              )

            );


          // -------------------------
          // DOB
          // -------------------------

          const dob =

            data.dob
            ?? data.dateOfBirth
            ?? data.DOB
            ?? null;


          if (dob) {

            this.front.dob =
              String(dob);
          }


          // If DOB was not returned,
          // derive from National ID.

          if (
            !this.front.dob
            &&
            this.front.nationalId
          ) {

            const id =

              this.toEnglishDigits(
                this.front.nationalId
              )
                .replace(
                  /\D/g,
                  ''
                );


            const parsedDob =

              this.parseDobFromEgyptId(
                id
              );


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
  // PROCESS BACK
  // =========================================================

  private processBackFile(
    file: File
  ): void {

    this.backFile = file;


    this.createPreview(
      file,
      preview => {

        this.backPreview =
          preview;

        this.cdr.detectChanges();
      }
    );


    this.loadingBack = true;


    this.ocr
      .extractBack(file)
      .pipe(

        finalize(() => {

          this.loadingBack =
            false;

          this.cdr.detectChanges();
        })

      )
      .subscribe({

        next: result => {

          const data: any =
            result;


          // -------------------------
          // OCCUPATION
          // -------------------------

          this.back.occupation =

            this.cleanOccupation(

              data.occupation
              ?? data.profession
              ?? data.proffession
              ?? data.job
              ?? ''

            );


          // -------------------------
          // GENDER
          // -------------------------

          this.back.gender =

            String(
              data.gender
              ?? ''
            )
              .trim();


          // -------------------------
          // RELIGION
          // -------------------------

          this.back.religion =

            String(
              data.religion
              ?? ''
            )
              .trim();


          // -------------------------
          // MARITAL STATUS
          // -------------------------

          this.back.maritalStatus =

            this.cleanMaritalStatus(

              data.maritalStatus
              ?? data.marital_status
              ?? data.marital
              ?? ''

            );


          // -------------------------
          // HUSBAND
          // -------------------------

          this.back.husbandName =

            String(

              data.husbandName
              ?? data.husband_name
              ?? data.husband
              ?? ''

            )
              .trim();


          // -------------------------
          // EXPIRY
          // -------------------------

          this.back.expiryDate =

            String(

              data.expiryDate
              ?? data.endDate
              ?? data.enddate
              ?? data.expiry
              ?? ''

            )
              .trim();


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
  // CAMERA OPEN
  // =========================================================

  async openCamera(
    target: 'front' | 'back'
  ): Promise<void> {

    this.cameraTarget =
      target;


    this.cameraError =
      '';


    this.cameraLoading =
      true;


    this.showCamera =
      true;


    this.cdr.detectChanges();


    if (
      !navigator.mediaDevices
      ||
      !navigator.mediaDevices.getUserMedia
    ) {

      this.cameraLoading =
        false;

      this.showCamera =
        false;


      this.openError(
        'Camera access is not supported by this browser.'
      );

      return;
    }


    try {

      // First permission request.
      // Browser usually does not reveal camera names
      // until permission is granted.

      const permissionStream =

        await navigator.mediaDevices
          .getUserMedia({

            video: true,

            audio: false

          });


      permissionStream
        .getTracks()
        .forEach(
          track =>
            track.stop()
        );


      // -------------------------
      // GET CAMERAS
      // -------------------------

      const devices =

        await navigator.mediaDevices
          .enumerateDevices();


      this.cameraDevices =

        devices.filter(
          device =>
            device.kind
            === 'videoinput'
        );


      if (
        this.cameraDevices.length === 0
      ) {

        throw new Error(
          'No camera was found.'
        );
      }


      // -------------------------
      // DEFAULT:
      // Prefer integrated camera
      // -------------------------

      const integratedCamera =

        this.cameraDevices.find(
          camera =>
            this.isIntegratedCamera(
              camera.label
            )
        );


      this.selectedCameraId =

        integratedCamera?.deviceId
        ??
        this.cameraDevices[0].deviceId;


      this.cdr.detectChanges();


      await this.startSelectedCamera();

    }
    catch (error) {

      console.error(
        'Camera access error:',
        error
      );


      this.stopCameraStream();


      this.showCamera =
        false;


      this.openError(
        'Could not access the camera. Please allow camera permission in the browser and try again.'
      );
    }
    finally {

      this.cameraLoading =
        false;

      this.cdr.detectChanges();
    }
  }


  // =========================================================
  // START SELECTED CAMERA
  // =========================================================

  async startSelectedCamera():
    Promise<void> {

    this.stopCameraStream();


    this.cameraLoading =
      true;


    this.cameraError =
      '';


    try {

      const videoConstraints:
        MediaTrackConstraints = {};


      if (this.selectedCameraId) {

        videoConstraints.deviceId = {

          exact:
            this.selectedCameraId

        };
      }


      // Good resolution for ID OCR

      videoConstraints.width = {
        ideal: 1920
      };

      videoConstraints.height = {
        ideal: 1080
      };


      this.cameraStream =

        await navigator.mediaDevices
          .getUserMedia({

            video:
              videoConstraints,

            audio:
              false

          });


      this.cdr.detectChanges();


      // Wait until Angular renders the video tag

      setTimeout(
        async () => {

          const video =

            this.cameraVideo
              ?.nativeElement;


          if (!video) {

            return;
          }


          video.srcObject =
            this.cameraStream;


          try {

            await video.play();

          }
          catch (error) {

            console.error(
              'Camera video play error:',
              error
            );

          }

        },
        0
      );

    }
    catch (error) {

      console.error(
        'Selected camera error:',
        error
      );


      this.cameraError =
        'Unable to start the selected camera.';


      this.openError(
        'Unable to start the selected camera.'
      );

    }
    finally {

      this.cameraLoading =
        false;

      this.cdr.detectChanges();
    }
  }


  // =========================================================
  // CHANGE CAMERA
  // =========================================================

  async onCameraChanged():
    Promise<void> {

    if (!this.selectedCameraId) {
      return;
    }


    await this.startSelectedCamera();
  }


  // =========================================================
  // CAMERA LABEL
  // =========================================================

  cameraDisplayName(
    camera: MediaDeviceInfo,
    index: number
  ): string {

    const label =
      camera.label
        ?.trim();


    if (!label) {

      return `Camera ${index + 1}`;
    }


    if (
      this.isIntegratedCamera(label)
    ) {

      return `Laptop / Integrated Camera - ${label}`;
    }


    if (
      this.isExternalCamera(label)
    ) {

      return `External Camera - ${label}`;
    }


    return label;
  }


  private isIntegratedCamera(
    label: string
  ): boolean {

    const value =
      (
        label
        ?? ''
      )
        .toLowerCase();


    return (

      value.includes('integrated')
      ||
      value.includes('built-in')
      ||
      value.includes('builtin')
      ||
      value.includes('internal')
      ||
      value.includes('facetime')
      ||
      value.includes('front camera')

    );
  }


  private isExternalCamera(
    label: string
  ): boolean {

    const value =
      (
        label
        ?? ''
      )
        .toLowerCase();


    return (

      value.includes('logitech')
      ||
      value.includes('usb')
      ||
      value.includes('ugreen')
      ||
      value.includes('webcam')
      ||
      value.includes('external')

    );
  }


  // =========================================================
  // CAPTURE CAMERA PHOTO
  // =========================================================

  capturePhoto(): void {

    const video =

      this.cameraVideo
        ?.nativeElement;


    if (
      !video
      ||
      !video.videoWidth
      ||
      !video.videoHeight
    ) {

      this.openError(
        'Camera is not ready yet. Please wait a moment and try again.'
      );

      return;
    }


    const canvas =

      document.createElement(
        'canvas'
      );


    canvas.width =
      video.videoWidth;


    canvas.height =
      video.videoHeight;


    const context =

      canvas.getContext(
        '2d'
      );


    if (!context) {

      this.openError(
        'Could not capture camera image.'
      );

      return;
    }


    context.drawImage(

      video,

      0,
      0,

      canvas.width,
      canvas.height

    );


    canvas.toBlob(

      blob => {

        if (!blob) {

          this.openError(
            'Could not create the captured image.'
          );

          return;
        }


        const fileName =

          this.cameraTarget === 'front'

            ? `id-front-${Date.now()}.jpg`

            : `id-back-${Date.now()}.jpg`;


        const file =

          new File(

            [blob],

            fileName,

            {
              type: 'image/jpeg'
            }

          );


        const target =
          this.cameraTarget;


        this.closeCamera();


        // Run exactly the same OCR flow
        // used by normal uploaded images.

        if (
          target === 'front'
        ) {

          this.processFrontFile(
            file
          );

        }
        else {

          this.processBackFile(
            file
          );

        }

      },

      'image/jpeg',

      0.95

    );
  }


  // =========================================================
  // CLOSE CAMERA
  // =========================================================

  closeCamera(): void {

    this.stopCameraStream();


    this.showCamera =
      false;


    this.cameraLoading =
      false;


    this.cameraError =
      '';


    this.cdr.detectChanges();
  }


  // =========================================================
  // STOP CAMERA
  // =========================================================

  private stopCameraStream():
    void {

    if (
      this.cameraStream
    ) {

      this.cameraStream
        .getTracks()
        .forEach(
          track =>
            track.stop()
        );


      this.cameraStream =
        null;
    }


    const video =
      this.cameraVideo
        ?.nativeElement;


    if (video) {

      video.srcObject =
        null;
    }
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
    callback:
      (value: string) => void
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


    reader.readAsDataURL(
      file
    );
  }


  // =========================================================
  // OCR ERROR
  // =========================================================

  private getOcrErrorMessage(
    error: any,
    side: string
  ): string {

    if (
      error?.status === 0
    ) {

      return (

        `${side} OCR service could not be reached. `

        +

        `Make sure the .NET API and Python OCR service are running.`

      );
    }


    if (
      error?.status >= 500
    ) {

      return (

        `${side} OCR failed on the server. `

        +

        `Please try again.`

      );
    }


    return (

      `${side} OCR failed. `

      +

      `Please check the image and try again.`

    );
  }


  // =========================================================
  // DATE / AGE
  // =========================================================

  recalcAge(): void {

    if (
      !this.front.dob
    ) {

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


    if (
      century === null
    ) {

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

      `${year}-`

      +

      `${String(month).padStart(2, '0')}-`

      +

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


    if (

      parsed.getFullYear()
      !== year

      ||

      parsed.getMonth() + 1
      !== month

      ||

      parsed.getDate()
      !== day

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


    return value

      .replace(
        /\s+/g,
        ' '
      )

      .trim();
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

        .replace(
          /[أإآٱ]/g,
          'ا'
        )

        .replace(
          /ة/g,
          'ه'
        )

        .toLocaleLowerCase(
          'ar'
        );


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


    return value

      .replace(
        /\s+/g,
        ' '
      )

      .trim();
  }


  onOccupationBlur():
    void {

    this.back.occupation =

      this.cleanOccupation(
        this.back.occupation
      );
  }


  // =========================================================
  // DIGITS
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

  validateIdNumber():
    boolean {

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


  get dobIsIso():
    boolean {

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
  // MODALS
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

    this.closeCamera();

    this.cancel.emit();
  }


  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {

    this.stopCameraStream();
  }
}