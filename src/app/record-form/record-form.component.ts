import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RecordModel } from '../models/record.model';
import { OcrService } from '../services/ocr.service';
import { finalize } from 'rxjs';

/** Extra fields for the "Back" side */
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
  mode: 'manual' | 'upload' = 'manual';

  @Output() cancel = new EventEmitter<void>();
    constructor(private ocr: OcrService) {} // ⟵ inject service

  loadingFront = false;
  loadingBack = false;
  step: 'front' | 'back' = 'front';
  get frontDone() {
    return !!(this.front.name || this.front.nationalId || this.front.address || this.front.dob);
  }

  /* -------- front / back buckets -------- */
  front: {
    name?: string;
    nationalId?: string;
    address?: string;
    dob?: string;
    age?: number;

  } = {};

  back: BackData = {};

  /* -------- images & previews -------- */
  frontFile?: File;
  backFile?: File;
  frontPreview?: string | null;
  backPreview?: string | null;

  /** revoke when replaced to avoid leaks */
  private frontObjUrl?: string;
  private backObjUrl?: string;

  /* -------- mini-modals  -------- */
  showError = false;
  errorText = '';
  showConfirm = false;
  private pendingFrontOnly = false;
  private ocrFrontLast?: { name?: string; nationalId?: string; address?: string; dob?: string; age?: number; };
private ocrBackLast?: BackData;

// UI option: only fill empty fields (don't overwrite user's manual edits)
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

  /* -------- navigation -------- */
  go(s: 'front' | 'back') {
    if (s === 'back' && !this.frontDone) return;
    this.step = s;
  }
  goNext() {
    this.step = 'back';
  }

  /* -------- computed -------- */
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

  // age: respect number type and not overwrite unless told
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
  /* -------- uploads -------- */
  onFrontSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return this.openError('Please select an image file.');
    if (this.frontObjUrl) URL.revokeObjectURL(this.frontObjUrl);
    this.frontObjUrl = URL.createObjectURL(file);
    this.frontFile = file;
    this.frontPreview = this.frontObjUrl;
      this.extractFront();  // <— add this

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
    this.extractBack();
  }
  clearFront(e: Event) {
    e.preventDefault();
    if (this.frontObjUrl) URL.revokeObjectURL(this.frontObjUrl);
    this.frontObjUrl = undefined;
    this.frontFile = undefined;
    this.frontPreview = null;
  }
  clearBack(e: Event) {
    e.preventDefault();
    if (this.backObjUrl) URL.revokeObjectURL(this.backObjUrl);
    this.backObjUrl = undefined;
    this.backFile = undefined;
    this.backPreview = null;
  }

  /* -------- mock extractors (wire OCR later) -------- */
// record-form.component.ts (where you call extract)
extractFront() {
  if (this.isEdit || this.mode === 'manual') return; // safety
  if (!this.frontFile) { this.openError('Please upload the front image first.'); return; }
  this.loadingFront = true;
  this.ocr.extractFront(this.frontFile, 120)
    .pipe(finalize(() => this.loadingFront = false))
    .subscribe({
      next: res => {
        console.log('OCR front raw:', res);
        this.ocrFrontLast = {
          name: res?.name ?? '',
          nationalId: res?.nationalId ?? '',
          address: res?.address ?? '',
          dob: res?.dob ?? '',
          age: (typeof res?.age === 'number') ? res.age : undefined
        };
        // Apply with current strategy
        this.applyOcrFrontToForm(this.ocrFrontLast, !this.applyFillEmptyOnly);
        // If DOB filled, recalc age if OCR didn't set it
if (!this.front.age) this.recalcAge();

// ✅ Add this block here
if (!this.front.dob && this.front.nationalId) {
  const derived = this.parseDobFromEgyptId(this.front.nationalId);
  if (derived) {
    this.front.dob = derived;
    this.recalcAge();
  }
}
      },
      error: _ => this.openError('Front OCR failed.')
    });
}

extractBack() {
  if (this.isEdit || this.mode === 'manual') return; // safety
  if (!this.backFile) { this.openError('Please upload the back image first.'); return; }
  this.loadingBack = true;
  this.ocr.extractBack(this.backFile)
    .pipe(finalize(() => this.loadingBack = false))
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

        this.ocrBackLast = {
          occupation: occ,
          gender: r?.gender,
          religion: r?.religion,
          maritalStatus: r?.maritalStatus,
          husbandName: r?.husbandName,
          expiryDate: r?.expiryDate
        };

        // Apply with current strategy
        this.applyOcrBackToForm(this.ocrBackLast, !this.applyFillEmptyOnly);
      },
      error: _ => this.openError('Back OCR failed. Please try again.')
    });
}




  /* -------- save flow -------- */
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

  // keep digits only, then validate
  this.front.nationalId = (this.front.nationalId ?? '').replace(/\D/g, '');
  if (!this.validateIdNumber()) {
    this.openError('ID number must be 14 digits');
    return;
  }

  const payload: any = {
    name: this.front.name ?? '',
    idNumber: this.front.nationalId ?? '',   // existing
    nationalId: this.front.nationalId ?? '', // <-- add this for compatibility
    address: this.front.address ?? '',
    dateOfBirth: this.front.dob ?? '',
    age: this.front.age ?? 0,
    ...this.back,
    frontFile: this.isEdit ? null : (this.frontFile ?? null),
    backFile:  this.isEdit ? null : (this.backFile  ?? null),
  };

  // Optional: debug to verify you're emitting what you expect
  console.log('EMIT payload:', payload);

  this.save.emit(payload);
}




// Parse DOB from Egyptian national ID (14 digits)
private parseDobFromEgyptId(id: string): string | null {
  const m = id.match(/^([23])(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;

  const century = m[1] === '2' ? 1900 : m[1] === '3' ? 2000 : null;
  if (century == null) return null;

  const yy = parseInt(m[2], 10);
  const mm = parseInt(m[3], 10);
  const dd = parseInt(m[4], 10);

  // basic range checks
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const iso = `${century + yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return iso;
}

// Called whenever nationalId changes (manual or programmatic)
onIdChanged() {
  // keep digits-only in the model (optional but nice)
  this.front.nationalId = (this.front.nationalId ?? '').replace(/\D/g, '');

  // only derive when it's a valid 14-digit number
  if (!this.validateIdNumber()) return;

  const dob = this.parseDobFromEgyptId(this.front.nationalId!);
  if (dob) {
    this.front.dob = dob;
    this.recalcAge();
  }
}




  cancelSave() { this.showConfirm = false; }

  /* -------- mini modal helpers -------- */
  openError(msg: string) { this.errorText = msg; this.showError = true; }
  closeError() { this.showError = false; }

  onCancel() { this.cancel.emit(); }

  ngOnDestroy() {
    if (this.frontObjUrl) URL.revokeObjectURL(this.frontObjUrl);
    if (this.backObjUrl) URL.revokeObjectURL(this.backObjUrl);
  }
  // record-form.component.ts (inside class)
get dobIsIso(): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(this.front.dob ?? '');
}
hasArabic(s?: string) {
  return /[\u0590-\u08FF]/.test(s ?? '');
}
validateIdNumber(): boolean {
  const id = this.front.nationalId?.trim() ?? '';
  return /^[0-9]{14}$/.test(id);
}


}
