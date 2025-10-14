// record-list.component.ts
import { Component,ChangeDetectionStrategy  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RecordFormComponent } from '../record-form/record-form.component';
import { RecordModel } from '../models/record.model';
import { CreateUpdateRecordDto, OcrService } from '../services/ocr.service';

@Component({
  selector: 'app-record-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RecordFormComponent],
  templateUrl: './record-list.component.html',
  styleUrls: ['./record-list.component.css']
})
export class RecordListComponent {
  // --- search
  nameTerm = '';
  idTerm = '';
  addressTerm = '';

  currentLang: 'en' | 'ar' = 'en';
  showForm = false;
deleting = false;
private deleteId: number | null = null;
  // --- server paging state
  pageNumber = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  loading = false;
  errorText = '';
  showError = false;
  showSuccess = false;
  successText = '';

  // data
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

  constructor(private translate: TranslateService, private ocr: OcrService) {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('lang')) as 'en' | 'ar' | null;
    this.currentLang = saved ?? 'en';
    this.translate.use(this.currentLang);
    this.applyDir(this.currentLang);

    this.loadPage(this.pageNumber);
  }

  // ===== data loading + pagination =====
 loadPage(page: number) {
  this.loading = true;

  this.ocr.listRecords({ pageNumber: page, pageSize: this.pageSize })
    .subscribe({
      next: (res) => {
        // map server items
       this.records = (res.items ?? []).map((r: any) => {
  const dob = r.dateOfBirth ?? r.dob ?? '';   // <-- define it here

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
  };
});

        this.filteredRecords = [...this.records];

        // 🔢 update paging state from server
        this.pageNumber = res.pageNumber ?? page;
        this.pageSize   = res.pageSize   ?? this.pageSize;
        this.totalCount = res.totalCount ?? (this.records?.length ?? 0);
        // if API doesn’t send totalPages, compute it
        this.totalPages = res.totalPages ?? Math.ceil(this.totalCount / this.pageSize);
      },
      error: _ => {
        this.showError = true;
        this.errorText = 'Load failed';
      }
    })
    .add(() => this.loading = false);
}



 goFirst()  { if (this.pageNumber !== 1) this.loadPage(1); }
goPrev()   { if (this.pageNumber > 1) this.loadPage(this.pageNumber - 1); }
goNext()   { if (!this.totalPages || this.pageNumber < this.totalPages) this.loadPage(this.pageNumber + 1); }
goLast()   { if (this.totalPages && this.pageNumber !== this.totalPages) this.loadPage(this.totalPages); }

  // ===== i18n / ui helpers =====
  switchLang() {
    this.currentLang = this.currentLang === 'en' ? 'ar' : 'en';
    this.translate.use(this.currentLang);
    if (typeof window !== 'undefined') localStorage.setItem('lang', this.currentLang);
    this.applyDir(this.currentLang);
  }
  private applyDir(lang: 'en' | 'ar') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }

  // ===== form open/close =====
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
  }
  onCancel() { this.showForm = false; }

  private isDuplicateId(id: string, ignoreId?: string) {
    const target = id?.trim();
    if (!target) return false;
    return this.records.some(r => r.idNumber === target && r.idNumber !== ignoreId);
  }

// record-list.component.ts (inside class)
// record-list.component.ts
private toDto(rec: any): CreateUpdateRecordDto {
  // ensure you send JSON for manual/create & edit
  return {
    name: (rec.name ?? '').trim(),
    idNumber: (rec.idNumber ?? '').trim(),
    dateOfBirth: rec.dateOfBirth ? String(rec.dateOfBirth) : null, // keep ISO if you can
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

  const done = () => {
    this.showForm = false;
    this.loadPage(this.pageNumber);
    this.successText = 'Saved ✓';
    this.showSuccess = true;
    setTimeout(() => (this.showSuccess = false), 1200);
  };

  if (this.editingKey) {
    // ✅ Prefer the id from the draft you opened
    const recordId =
      (this.draft as any)?.id ??
      this.records.find(r => r.idNumber === this.editingKey)?.id;

    if (!recordId) {
      this.showError = true;
      this.errorText = 'Missing record ID for update.';
      return;
    }

    this.ocr.updateRecord(recordId, dto).subscribe({
      next: done,
      error: err => { this.showError = true; this.errorText = 'Update failed'; console.error(err); }
    });
    return;
  }


  // ------- ADD -------
  // ------- ADD -------
// By default, save exactly what the user edited (JSON).
// Only if you explicitly want to re-run OCR at save-time, flip this flag.
const reRunOcrOnSave = false;

if (reRunOcrOnSave && (rec.frontFile || rec.backFile)) {
  const fd = new FormData();
  if (rec.frontFile) fd.append('FrontImage', rec.frontFile);
  if (rec.backFile)  fd.append('BackImage',  rec.backFile);
  fd.append('Name', dto.name);
  fd.append('IdNumber', dto.idNumber);
  fd.append('DateOfBirth', dto.dateOfBirth ?? '');
  fd.append('Address', dto.address ?? '');
  fd.append('Gender', dto.gender ?? '');
  fd.append('Profession', dto.profession ?? '');
  fd.append('MaritalStatus', dto.maritalStatus ?? '');
  fd.append('Religion', dto.religion ?? '');
  fd.append('EndDate', dto.endDate ?? '');

  this.ocr.postFormDataToImport(fd).subscribe({
    next: done,
    error: err => { this.showError = true; this.errorText = 'Create (OCR) failed'; console.error(err); }
  });
} else {
  // ✅ Create via JSON so the edited fields are persisted exactly as typed
  this.ocr.createRecord(dto).subscribe({
    next: done,
    error: err => { this.showError = true; this.errorText = 'Create (manual) failed'; console.error(err); }
  });
}
}


private onHttpError = (err: any) => {
  console.error(err);
  this.showError = true;
  this.errorText = 'Save failed';
};







  closeError() { this.showError = false; }

  // ===== client-side search =====
  // onSearchClick() {
  //   const name = this.nameTerm.toLowerCase();
  //   const id = this.idTerm.toLowerCase();
  //   const addr = this.addressTerm.toLowerCase();

  //   this.filteredRecords = this.records.filter(r =>
  //     (!name || (r.name ?? '').toLowerCase().includes(name)) &&
  //     (!id   || (r.idNumber ?? '').toLowerCase().includes(id)) &&
  //     (!addr || (r.address ?? '').toLowerCase().includes(addr))
  //   );
  // }
onSearchClick() {
  this.loading = true;

  this.ocr.listRecordsSearch({
    name: this.nameTerm,
    idNumber: this.idTerm,
    pageNumber: 1,
    pageSize: this.pageSize
  }).subscribe({
    next: (res) => {
      this.records = (res.items ?? []).map((r: any) => {
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
      });

      this.filteredRecords = [...this.records];
      this.pageNumber = res.pageNumber ?? 1;
      this.totalCount = res.totalCount ?? this.records.length;
      this.totalPages = res.totalPages ?? Math.ceil(this.totalCount / this.pageSize);
    },
    error: _ => { this.showError = true; this.errorText = 'Search failed'; }
  }).add(() => this.loading = false);
}


 clearSearch() {
  this.nameTerm = '';
  this.idTerm = '';
  // optionally reset addressTerm if you add it later:
  // this.addressTerm = '';

  // Reload fresh data from server (first page)
  this.loadPage(1);
}


  // ✅ class method (no `function` keyword)
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
  this.draft = { ...rec, id: rec.id }; // 🔸 ensure id is on the draft
  this.showForm = true;
}

askDelete(index: number) {
  const row = this.filteredRecords[index];
  if (!row) return;

  // find same row in full list to get the server id
  const full = this.records.find(r => r.idNumber === row.idNumber);
  this.deleteId = full?.id ?? null;

  this.recordToDelete = row;
  this.showDeleteConfirm = !!this.recordToDelete;
}
confirmDelete() {
  if (!this.recordToDelete || this.deleteId == null) {
    this.cancelDelete();
    return;
  }

  this.deleting = true;
  this.ocr.deleteRecord(this.deleteId).subscribe({
    next: () => {
      // close dialog
      this.showDeleteConfirm = false;
      this.recordToDelete = null;
      this.deleteId = null;

      // reload the same page so the table reflects server state
      this.loadPage(this.pageNumber);
    },
    error: err => {
      this.showDeleteConfirm = false;
      this.recordToDelete = null;
      this.deleteId = null;

      this.showError = true;
      this.errorText = 'Delete failed';
      console.error(err);
    }
  }).add(() => this.deleting = false);
}

cancelDelete() {
  this.showDeleteConfirm = false;
  this.recordToDelete = null;
  this.deleteId = null;
}
}
