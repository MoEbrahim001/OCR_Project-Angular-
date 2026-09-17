import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, switchMap, tap } from 'rxjs/operators';

import { RecordFormComponent } from '../record-form/record-form.component';
import { RecordModel } from '../models/record.model';
import { CreateUpdateRecordDto, OcrService } from '../services/ocr.service';
import { ArabicDigitsPipe } from '../arabic-digits.pipe';
type PageParams = {
  pageNumber: number;
  pageSize: number;
  name?: string;
  idNumber?: string;
  isSearch?: boolean;
};

@Component({
  selector: 'app-record-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RecordFormComponent,ArabicDigitsPipe],
  templateUrl: './record-list.component.html',
  styleUrls: ['./record-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecordListComponent implements OnInit, OnDestroy {

  nameTerm = '';
  idTerm = '';
  addressTerm = '';

  currentLang: 'en' | 'ar' = 'en';
  showForm = false;

  deleting = false;
  private deleteId: number | null = null;

  pageNumber = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  loading = false;
  errorText = '';
  showError = false;
  showSuccess = false;
  successText = '';

  records: RecordModel[] = [];
  filteredRecords: RecordModel[] = [];

  draft: Partial<RecordModel> = {
    name: '',
    idNumber: '',
    address: '',
    dateOfBirth: '',
    age: 0,
    imageDataUrl: null,
    occupation: undefined,
    gender: undefined,
    religion: undefined,
    maritalStatus: undefined,
    expiryDate: undefined,
    marital: undefined,
    husbandName: undefined,
    frontImageDataUrl: null,
    backImageDataUrl: null
  };

  editingKey: string | null = null;
  showDeleteConfirm = false;
  private recordToDelete: RecordModel | null = null;

  private pageParams$ = new Subject<PageParams>();
  private sub?: Subscription;

  constructor(
    private translate: TranslateService,
    private ocr: OcrService,
    private cdr: ChangeDetectorRef
  ) {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('lang')) as 'en' | 'ar' | null;
    this.currentLang = saved ?? 'en';
    this.translate.use(this.currentLang);
    this.applyDir(this.currentLang);
  }

  ngOnInit(): void {
   this.sub = this.pageParams$
  .pipe(
    debounceTime(50),
    tap(() => { this.loading = true; this.cdr.markForCheck(); }),
    switchMap(p => {
      const call$ = p.isSearch
        ? this.ocr.listRecordsSearch({
            name: p.name ?? '',
            idNumber: p.idNumber ?? '',
            pageNumber: p.pageNumber,
            pageSize: p.pageSize
          })
        : this.ocr.listRecords({
            pageNumber: p.pageNumber,
            pageSize: p.pageSize
          });

      return call$.pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }));
    })
  )
  .subscribe({
        next: (res: any) => {
          this.records = (res.items ?? []).map(this.mapItem);
          this.filteredRecords = this.records;

          this.pageNumber = res.pageNumber ?? this.pageNumber;
          this.pageSize   = res.pageSize   ?? this.pageSize;
          this.totalCount = res.totalCount ?? this.records.length;
          this.totalPages = res.totalPages ?? Math.ceil(this.totalCount / Math.max(this.pageSize, 1));

          this.cdr.markForCheck();
        },
        error: _ => {
          this.showError = true;
          this.errorText = 'Load failed';
          this.cdr.markForCheck();
        }
      });

    this.loadPage(1);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private mapItem = (r: any): RecordModel => {
    const dob = r.dateOfBirth ?? r.dob ?? '';
    return {
      id: r.id,
      name: r.name ?? '',
      idNumber: r.idNumber ?? r.nationalId ?? '',
      address: r.address ?? '',
      dateOfBirth: dob,
      age: (typeof r.age === 'number' && r.age > 0) ? r.age : this.calcAge(dob),
      religion: r.religion ?? undefined,
      gender: r.gender ?? undefined,
      occupation: r.profession ?? r.occupation ?? undefined,
      maritalStatus: r.maritalStatus ?? undefined,
      husbandName: r.husbandName ?? undefined,
      expiryDate: r.endDate ?? r.expiryDate ?? undefined,
      imageDataUrl: r.photoBase64 ?? r.imageDataUrl ?? null,
      frontImageDataUrl: r.frontImageDataUrl ?? null,
      backImageDataUrl: r.backImageDataUrl ?? null,
    } as RecordModel;
  };

  loadPage(page: number) {
    this.pageParams$.next({ pageNumber: page, pageSize: this.pageSize, isSearch: false });
  }
  goFirst() { if (this.pageNumber !== 1) this.loadPage(1); }
  goPrev()  { if (this.pageNumber > 1) this.loadPage(this.pageNumber - 1); }
  goNext()  { if (!this.totalPages || this.pageNumber < this.totalPages) this.loadPage(this.pageNumber + 1); }
  goLast()  { if (this.totalPages && this.pageNumber !== this.totalPages) this.loadPage(this.totalPages); }

  switchLang() {
    this.currentLang = this.currentLang === 'en' ? 'ar' : 'en';
    this.translate.use(this.currentLang);
    if (typeof window !== 'undefined') localStorage.setItem('lang', this.currentLang);
    this.applyDir(this.currentLang);
    this.cdr.markForCheck();
  }
  private applyDir(lang: 'en' | 'ar') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }

  openForm() {
    this.editingKey = null;
    this.draft = {
      name: '',
      idNumber: '',
      address: '',
      dateOfBirth: '',
      age: 0,
      imageDataUrl: null,
      occupation: undefined,
      gender: undefined,
      religion: undefined,
      maritalStatus: undefined,
      expiryDate: undefined,
      marital: undefined,
      husbandName: undefined,
      frontImageDataUrl: null,
      backImageDataUrl: null
    };
    this.showForm = true;
    this.cdr.markForCheck();
  }
  onCancel() { this.showForm = false; this.cdr.markForCheck(); }

  private isDuplicateId(id: string, ignoreId?: string) {
    const target = id?.trim();
    if (!target) return false;
    return this.records.some(r => r.idNumber === target && r.idNumber !== ignoreId);
  }

  private toDto(rec: any): CreateUpdateRecordDto {
    return {
      name: (rec.name ?? '').trim(),
      idNumber: (rec.idNumber ?? '').trim(),
      dateOfBirth: rec.dateOfBirth ? String(rec.dateOfBirth) : null,
      address: rec.address ?? null,
      gender: rec.gender ?? null,
      profession: rec.occupation ?? null,
      maritalStatus: rec.maritalStatus ?? null,
      religion: rec.religion ?? null,
      endDate: rec.expiryDate ?? null,
      photoBase64: null,
      faceBase64: null,
      notes: null
    };
  }

onSave(rec: any) {
  const dto = this.toDto(rec);

  const idForCheck = (rec.idNumber ?? '').trim();

  if (!this.editingKey) {
    if (this.isDuplicateId(idForCheck)) {
      this.showError = true;
      this.errorText = 'National ID already exists.';
      this.cdr.markForCheck();
      return;
    }
  } else {
    if (this.isDuplicateId(idForCheck, this.editingKey)) {
      this.showError = true;
      this.errorText = 'Another record already has this National ID.';
      this.cdr.markForCheck();
      return;
    }
  }

  if (this.editingKey) {
    const recordId =
      (this.draft as any)?.id ??
      this.records.find(r => r.idNumber === this.editingKey)?.id;

    if (!recordId) {
      this.showError = true;
      this.errorText = 'Missing record ID for update.';
      this.cdr.markForCheck();
      return;
    }

    this.ocr.updateRecord(recordId, dto).subscribe({
      next: (res: any) => {
        const updated = this.mapItem({ id: recordId, ...(res || {}), ...dto });
        this.replaceInArrays(updated);
        this.finishSave('Updated ✓');
      },
      error: err => {
        this.showError = true;
        this.errorText = 'Update failed';
        console.error(err);
        this.cdr.markForCheck();
      }
    });
    return;
  }

  this.ocr.createRecord(dto).subscribe({
    next: (res: any) => {
      const created = this.mapItem(res || dto);
      this.records = [created, ...this.records];
      this.filteredRecords = [created, ...this.filteredRecords];
      this.finishSave('Saved ✓');
    },
    error: err => {
      this.showError = true;
      this.errorText = 'Create (manual) failed';
      console.error(err);
      this.cdr.markForCheck();
    }
  });
}



  closeError() { this.showError = false; this.cdr.markForCheck(); }

 
onSearchClick() {
  const nameNorm = this.normalizeArabic(this.nameTerm);
  const idAscii  = this.toEnglishDigits(this.idTerm).replace(/\D/g, '');

  this.pageParams$.next({
    pageNumber: 1,
    pageSize: this.pageSize,
    name: nameNorm,         
    idNumber: idAscii,
    isSearch: true
  });
}

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
onIdTermChanged(value: string) {
  const ascii = this.toEnglishDigits(value).replace(/\D/g, '');
  this.idTerm = this.toArabicDigits(ascii);
  this.cdr.markForCheck();
}
  clearSearch() {
    this.nameTerm = '';
    this.idTerm = '';
    this.loadPage(1);
  }

  private calcAge(dobStr?: string): number {
    if (!dobStr) return 0;
    const d = new Date(dobStr);
    if (isNaN(d.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  }

  startEdit(index: number) {
    const rec = this.filteredRecords[index];
    if (!rec) return;
    this.editingKey = rec.idNumber;
    this.draft = { ...rec, id: rec.id };
    this.showForm = true;
    this.cdr.markForCheck();
  }

  askDelete(index: number) {
    const row = this.filteredRecords[index];
    if (!row) return;
    const full = this.records.find(r => r.idNumber === row.idNumber);
    this.deleteId = full?.id ?? null;
    this.recordToDelete = row;
    this.showDeleteConfirm = !!this.recordToDelete;
    this.cdr.markForCheck();
  }

  confirmDelete() {
    if (!this.recordToDelete || this.deleteId == null) {
      this.cancelDelete();
      return;
    }
    this.deleting = true;
    this.ocr.deleteRecord(this.deleteId).subscribe({
   next: () => {
  if (this.recordToDelete) {
    this.records = this.records.filter(r => r.id !== this.deleteId);
    this.filteredRecords = this.filteredRecords.filter(r => r.id !== this.deleteId);
    this.totalCount--;
  }

  this.showDeleteConfirm = false;
  this.recordToDelete = null;
  this.deleteId = null;

  this.successText = 'Deleted successfully ✓';
  this.showSuccess = true;
  setTimeout(() => {
    this.showSuccess = false;
    this.cdr.markForCheck();
  }, 1200);

  this.cdr.markForCheck();
},

      error: err => {
        this.showDeleteConfirm = false;
        this.recordToDelete = null;
        this.deleteId = null;
        this.showError = true;
        this.errorText = 'Delete failed';
        console.error(err);
        this.cdr.markForCheck();
      }
    }).add(() => { this.deleting = false; this.cdr.markForCheck(); });
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.recordToDelete = null;
    this.deleteId = null;
    this.cdr.markForCheck();
  }
private replaceInArrays(updated: RecordModel) {
  const i = this.records.findIndex(r => r.id === updated.id);
  if (i > -1) this.records[i] = { ...updated };

  const j = this.filteredRecords.findIndex(r => r.id === updated.id);
  if (j > -1) this.filteredRecords[j] = { ...updated };

  this.cdr.markForCheck();
}

private finishSave(msg = 'Saved ✓') {
  this.showForm = false;
  this.successText = msg;
  this.showSuccess = true;
  setTimeout(() => { this.showSuccess = false; this.cdr.markForCheck(); }, 1200);
  this.cdr.markForCheck();
}

  trackById = (_: number, r: RecordModel) => r.id;
private normalizeArabic(input: string): string {
  if (!input) return '';
  let s = input;

  s = s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');

  s = s.replace(/[\u0640\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B-\u200D]/g, '');

  s = s
    .replace(/[أإآٱ]/g, 'ا')   
    .replace(/ى|ی/g, 'ي')       
    .replace(/ة/g, 'ه')              
    .replace(/ؤ/g, 'و')             
    .replace(/ئ/g, 'ي')             
    .replace(/گ/g, 'ك')            
    .replace(/پ/g, 'ب');        

  s = s.replace(/\s+/g, ' ').trim();

  return s.toLocaleLowerCase('ar');
}
get existingIds(): string[] {
  return this.records
    .map(r => r.idNumber ?? '')
    .filter(id => !!id);
}
onNameKeyDown(event: KeyboardEvent) {
  const key = event.key;

  const controlKeys = [
    'Backspace', 'Delete',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Tab', 'Home', 'End'
  ];
  if (controlKeys.includes(key)) return;

  if (key === ' ') return;

  const arabicLetterRegex = /^[\u0621-\u064A]$/;
  if (!arabicLetterRegex.test(key)) {
    event.preventDefault();  
  }
}

onNameTermChanged(value: string) {
  if (!value) {
    this.nameTerm = '';
    this.cdr.markForCheck();
    return;
  }

  let s = value.replace(/[^\u0621-\u064A\s]/g, '');

  s = s.replace(/\s+/g, ' ').trimStart();

  this.nameTerm = s;
  this.cdr.markForCheck();
}






}
