import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RecordModel } from '../models/record.model';
import { OcrService } from '../services/ocr.service';
import { finalize } from 'rxjs';
import { ChangeDetectorRef, NgZone } from '@angular/core';


interface BackData {
  occupation?: string;
  gender?: string;
  religion?: string;
  maritalStatus?: string;
  husbandName?:string;
  expiryDate?: string;        
}

export type RecordValue = (RecordModel & BackData) & {
  frontImageDataUrl?: string | null;
  backImageDataUrl?: string | null;
};

@Component({
  selector: 'app-record-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './record-form.component.html',
  styleUrls: ['./record-form.component.css'],
})
export class RecordFormComponent {
  @Input() value: Partial<RecordValue> = {};
  @Output() save = new EventEmitter<RecordValue>();
  @Input() isEdit = false;
  @Input() existingIds :string[]=[]; 
  mode: 'manual' | 'upload' = 'manual';

  @Output() cancel = new EventEmitter<void>();
constructor(private ocr: OcrService, private cdr: ChangeDetectorRef, private zone: NgZone) {}

private applyAndRefresh(mutator: () => void) {
  this.zone.run(() => {
    mutator();
    
    this.cdr.detectChanges();
  });
  
}
  loadingFront = false;
  loadingBack = false;
    frontExtracted = false;
  backExtracted = false;
  step: 'front' | 'back' = 'front';
  get frontDone() {
    return !!(this.front.name || this.front.nationalId || this.front.address || this.front.dob);
  }

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

  private frontObjUrl?: string;
  private backObjUrl?: string;

  showError = false;
  errorText = '';
  showConfirm = false;
  private pendingFrontOnly = false;
  private ocrFrontLast?: { name?: string; nationalId?: string; address?: string; dob?: string; age?: number; };
private ocrBackLast?: BackData;

applyFillEmptyOnly = true; 

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

    this.frontPreview = (this.value.frontImageDataUrl ??
                         this.value.imageDataUrl ?? null) || null;
    this.backPreview = this.value.backImageDataUrl ?? null;
  }

  go(s: 'front' | 'back') {
    if (s === 'back' && !this.frontDone) return;
    this.step = s;
  }
  goNext() {
    this.step = 'back';
  }

  recalcAge() {
    if (!this.front.dob) { this.front.age = undefined; return; }
    const birth = new Date(this.front.dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    this.front.age = Math.max(0, age);
  }
private applyOcrFrontToForm(src: any, overwrite = false) {
  if (!src) return;
  const set = (key: keyof typeof this.front, val: any) => {
    if (overwrite) this.front[key] = (val ?? '');
    else if (!this.front[key]) this.front[key] = (val ?? '');
  };
  set('name', src.name);
  set('nationalId', src.nationalId);
  set('address', src.address);
  set('dob', src.dob);

  if (typeof src.age === 'number') {
    if (overwrite || this.front.age == null) this.front.age = src.age;
  }
}

private applyOcrBackToForm(src: BackData, overwrite = false) {
  if (!src) return;
  const set = (key: keyof BackData, val: any) => {
    if (overwrite) (this.back as any)[key] = (val ?? '');
    else if (!(this.back as any)[key]) (this.back as any)[key] = (val ?? '');
  };
  set('occupation', src.occupation);
  set('gender', src.gender);
  set('religion', src.religion);
  set('maritalStatus', src.maritalStatus);
  set('husbandName', src.husbandName);
  set('expiryDate', src.expiryDate);
}
onFrontSelected(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return this.openError('Please select an image file.');
  if (this.frontObjUrl) URL.revokeObjectURL(this.frontObjUrl);
  this.frontObjUrl = URL.createObjectURL(file);
  this.frontFile = file;
  this.frontPreview = this.frontObjUrl;

  // ✅ new: mark as not yet extracted for this file
  this.frontExtracted = false;

  this.extractFront();
}

onBackSelected(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return this.openError('Please select an image file.');
  if (this.backObjUrl) URL.revokeObjectURL(this.backObjUrl);
  this.backObjUrl = URL.createObjectURL(file);
  this.backFile = file;
  this.backPreview = this.backObjUrl;

  // ✅ new: mark as not yet extracted for this file
  this.backExtracted = false;

  this.extractBack();
}

 clearFront(e: Event) {
  e.preventDefault();
  if (this.frontObjUrl) URL.revokeObjectURL(this.frontObjUrl);
  this.frontObjUrl = undefined;
  this.frontFile = undefined;
  this.frontPreview = null;

  this.frontExtracted = false;
}

clearBack(e: Event) {
  e.preventDefault();
  if (this.backObjUrl) URL.revokeObjectURL(this.backObjUrl);
  this.backObjUrl = undefined;
  this.backFile = undefined;
  this.backPreview = null;

  this.backExtracted = false;
}

extractFront() {
  if (this.isEdit || this.mode === 'manual') return;
  if (!this.frontFile) { this.openError('Please upload the front image first.'); return; }
  this.loadingFront = true;

  this.ocr.extractFront(this.frontFile, 120)
    .pipe(finalize(() => {
      this.loadingFront = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
    next: res => {
  this.applyAndRefresh(() => {
    const arabicId = this.toArabicDigits(res?.nationalId ?? '');

    this.ocrFrontLast = {
      name: res?.name ?? '',
      nationalId: arabicId,
      address: res?.address ?? '',
      dob: res?.dob ?? '',
      age: (typeof res?.age === 'number') ? res.age : undefined
    };

    this.applyOcrFrontToForm(this.ocrFrontLast, !this.applyFillEmptyOnly);
    if (!this.front.age) this.recalcAge();

    this.frontExtracted = true;
  });
},
error: _ => {
  this.frontExtracted = false;
  this.openError('Front OCR failed.');
}
  });
}


extractBack() {
  if (this.isEdit || this.mode === 'manual') return;
  if (!this.backFile) { this.openError('Please upload the back image first.'); return; }
  this.loadingBack = true;

  this.ocr.extractBack(this.backFile)
    .pipe(finalize(() => {
      this.loadingBack = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
     next: (res: any) => {
  const r = (res && res.data) ? res.data : res;

        let occ =
          r?.occupation ?? r?.Occupation ??
          r?.profession ?? r?.Profession ??
          r?.proffession ?? r?.Proffession ??
          r?.job ?? r?.Job ?? r?.jobTitle ?? r?.JobTitle;
        if (typeof occ === 'string' && /\|/.test(occ)) {
          occ = occ.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
        }

        this.applyAndRefresh(() => {
    this.ocrBackLast = {
      occupation: occ,
      gender: r?.gender,
      religion: r?.religion,
      maritalStatus: r?.maritalStatus,
      husbandName: r?.husbandName,
      expiryDate: r?.expiryDate
    };
    this.applyOcrBackToForm(this.ocrBackLast, !this.applyFillEmptyOnly);
      this.backExtracted = true;


        });
      },
error: _ => {
  this.backExtracted = false;
  this.openError('Back OCR failed. Please try again.');
}    });
}

// Map Arabic-Indic (٠-٩) & Persian (۰-۹) to ASCII
private toEnglishDigits(s: string): string {
  const map: Record<string, string> = {
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'
  };
  return (s ?? '').replace(/[٠-٩۰-۹]/g, d => map[d] ?? d);
}
private toArabicDigits(s: string): string {
  const a = '٠١٢٣٤٥٦٧٨٩';
  return (s ?? '').replace(/\d/g, d => a[+d]);
}



  saveNow(frontOnly: boolean) {
    if (!this.front.name?.trim() && !this.front.nationalId?.trim()) {
      this.openError('Please provide at least a Name or National ID on the front.');
      return;
    }
    this.pendingFrontOnly = frontOnly;
    this.showConfirm = true; 
  }
confirmSave() {
  this.showConfirm = false;

  const idEn = this.toEnglishDigits(this.front.nationalId ?? '').replace(/\D/g, '');
  if (idEn.length !== 14) {
    this.openError('ID number must be 14 digits');
    return;
  }

  if (!this.isEdit && this.existingIds?.includes(idEn)) {
    this.openError('Record already exists');
    return;
  }

  const payload: any = {
    name: this.front.name ?? '',
    idNumber: idEn,            
    nationalId: idEn,          
    address: this.front.address ?? '',
    dateOfBirth: this.front.dob ?? '',
    age: this.front.age ?? 0,
    ...this.back,
    frontFile: this.isEdit ? null : (this.frontFile ?? null),
    backFile:  this.isEdit ? null : (this.backFile  ?? null),
  };

  console.log('EMIT payload:', payload);
  this.save.emit(payload);
}





private parseDobFromEgyptId(id: string): string | null {
  const m = id.match(/^([23])(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;

  const century = m[1] === '2' ? 1900 : m[1] === '3' ? 2000 : null;
  if (century == null) return null;

  const yy = parseInt(m[2], 10);
  const mm = parseInt(m[3], 10);
  const dd = parseInt(m[4], 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const iso = `${century + yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return iso;
}

onIdChanged() {
  const en = this.toEnglishDigits(this.front.nationalId ?? '');
  const digits = en.replace(/\D/g, '');
  this.front.nationalId = this.toArabicDigits(digits);

  if (digits.length !== 14) return;
  const dob = this.parseDobFromEgyptId(digits);
  if (dob) { this.front.dob = dob; this.recalcAge(); }
}





  cancelSave() { this.showConfirm = false; }

  openError(msg: string) { this.errorText = msg; this.showError = true; }
  closeError() { this.showError = false; }

  onCancel() { this.cancel.emit(); }

  ngOnDestroy() {
    if (this.frontObjUrl) URL.revokeObjectURL(this.frontObjUrl);
    if (this.backObjUrl) URL.revokeObjectURL(this.backObjUrl);
  }
get dobIsIso(): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(this.front.dob ?? '');
}
hasArabic(s?: string) {
  return /[\u0590-\u08FF]/.test(s ?? '');
}
validateIdNumber(): boolean {
  const idEn = this.toEnglishDigits(this.front.nationalId ?? '').replace(/\D/g, '');
  return idEn.length === 14;
}



}
