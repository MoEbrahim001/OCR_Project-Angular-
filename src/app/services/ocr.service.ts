import {
  Injectable
} from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  environment
} from '../../environments/environments';

import {
  RecordModel
} from '../models/record.model';


export interface FrontOcrResult {

  name?: string;

  nationalId?: string;

  address?: string;

  dob?: string;

  age?: number;
}


export interface BackOcrResult {

  occupation?: string;

  gender?: string;

  religion?: string;

  maritalStatus?: string;

  husbandName?: string;

  expiryDate?: string;
}


export interface PagedResult<T> {

  items: T[];

  pageNumber: number;

  pageSize: number;

  totalCount: number;

  totalPages?: number;
}


export interface CreateUpdateRecordDto {

  name: string;

  idNumber: string;

  dateOfBirth:
    string | null;

  address:
    string | null;

  gender?:
    string | null;

  profession?:
    string | null;

  maritalStatus?:
    string | null;

  religion?:
    string | null;

  endDate?:
    string | null;

  photoBase64?:
    string | null;

  faceBase64?:
    string | null;

  notes?:
    string | null;

  frontImageDataUrl?:
    string | null;

  backImageDataUrl?:
    string | null;
}


@Injectable({
  providedIn: 'root'
})

export class OcrService {

  constructor(
    private http: HttpClient
  ) {}


  // =====================================================
  // OCR FRONT
  // =====================================================

  extractFront(
    file: File,
    threshold = 120
  ) {

    const form =
      new FormData();


    form.append(
      'file',
      file
    );


    const params =
      new HttpParams()
        .set(
          'threshold',
          threshold
        );


    return this.http
      .post<FrontOcrResult>(

        environment.ocr.front,

        form,

        {
          params
        }
      );
  }


  // =====================================================
  // OCR BACK
  // =====================================================

  extractBack(
    file: File,
    threshold = 120
  ) {

    const form =
      new FormData();


    form.append(
      'file',
      file
    );


    const params =
      new HttpParams()
        .set(
          'threshold',
          threshold
        );


    return this.http
      .post<BackOcrResult>(

        environment.ocr.back,

        form,

        {
          params
        }
      );
  }


  // =====================================================
  // LIST
  // =====================================================

  listRecords(
    opts: {
      pageNumber: number;
      pageSize: number;
    }
  ) {

    const params =
      new HttpParams()

        .set(
          'pageNumber',
          opts.pageNumber
        )

        .set(
          'pageSize',
          opts.pageSize
        );


    return this.http
      .get<PagedResult<RecordModel>>(

        environment.records.list,

        {
          params
        }
      );
  }


  // =====================================================
  // SEARCH
  // =====================================================
listRecordsSearch(
  params: {
    name?: string;
    idNumber?: string;

    address?: string;
    gender?: string;
    dateOfBirth?: string;

    age?: number | null;

    religion?: string;
    profession?: string;
    maritalStatus?: string;

    husbandName?: string;
    endDate?: string;

    pageNumber?: number;
    pageSize?: number;
  }
) {

  let httpParams =
    new HttpParams()

      .set(
        'pageNumber',
        String(params.pageNumber ?? 1)
      )

      .set(
        'pageSize',
        String(params.pageSize ?? 10)
      );


  if (params.name?.trim()) {
    httpParams =
      httpParams.set(
        'name',
        params.name.trim()
      );
  }


  if (params.idNumber?.trim()) {
    httpParams =
      httpParams.set(
        'idNumber',
        params.idNumber.trim()
      );
  }


  if (params.address?.trim()) {
    httpParams =
      httpParams.set(
        'address',
        params.address.trim()
      );
  }


  if (params.gender?.trim()) {
    httpParams =
      httpParams.set(
        'gender',
        params.gender.trim()
      );
  }


  if (params.dateOfBirth) {
    httpParams =
      httpParams.set(
        'dateOfBirth',
        params.dateOfBirth
      );
  }


  if (
    params.age !== null
    &&
    params.age !== undefined
  ) {
    httpParams =
      httpParams.set(
        'age',
        String(params.age)
      );
  }


  if (params.religion?.trim()) {
    httpParams =
      httpParams.set(
        'religion',
        params.religion.trim()
      );
  }


  if (params.profession?.trim()) {
    httpParams =
      httpParams.set(
        'profession',
        params.profession.trim()
      );
  }


  if (params.maritalStatus?.trim()) {
    httpParams =
      httpParams.set(
        'maritalStatus',
        params.maritalStatus.trim()
      );
  }


  if (params.husbandName?.trim()) {
    httpParams =
      httpParams.set(
        'husbandName',
        params.husbandName.trim()
      );
  }


  if (params.endDate) {
    httpParams =
      httpParams.set(
        'endDate',
        params.endDate
      );
  }


  return this.http
    .get<PagedResult<RecordModel>>(

      environment.records.search,

      {
        params: httpParams
      }
    );
}


  // =====================================================
  // CREATE
  // =====================================================

  createRecord(
    dto:
      CreateUpdateRecordDto
  ) {

    return this.http
      .post<RecordModel>(

        environment.records.create,

        dto
      );
  }


  // =====================================================
  // UPDATE
  // =====================================================

  updateRecord(
    id: number,
    dto:
      CreateUpdateRecordDto
  ) {

    return this.http
      .put<RecordModel>(

        environment.records.edit
        + id,

        dto
      );
  }


  // =====================================================
  // DELETE
  // =====================================================

  deleteRecord(
    id: number
  ) {

    return this.http
      .delete<void>(

        environment.records.delete
        + id
      );
  }


  // =====================================================
  // GET BY ID
  // =====================================================

  getRecordById(
    id: number
  ) {

    return this.http
      .get<RecordModel>(

        environment.records.getbyid
        + id
      );
  }
  exportExcel(
  name?: string,
  idNumber?: string
) {

  let params =
    new HttpParams();


  if (
    name?.trim()
  ) {

    params =
      params.set(
        'name',
        name.trim()
      );
  }


  if (
    idNumber?.trim()
  ) {

    params =
      params.set(
        'idNumber',
        idNumber.trim()
      );
  }


  return this.http.get(

    environment.records.exportExcel,

    {
      params,
      responseType: 'blob'
    }
  );
}
exportPdf(
  name?: string,
  idNumber?: string
) {

  let params =
    new HttpParams();


  if (
    name?.trim()
  ) {

    params =
      params.set(
        'name',
        name.trim()
      );
  }


  if (
    idNumber?.trim()
  ) {

    params =
      params.set(
        'idNumber',
        idNumber.trim()
      );
  }


  return this.http.get(

    environment.records.exportPdf,

    {
      params,
      responseType: 'blob'
    }
  );
}
exportSelectedExcel(
  recordIds: number[]
) {

  return this.http.post(

    `${environment.records.exportExcel}/selected`,

    {
      recordIds
    },

    {
      responseType: 'blob'
    }
  );
}


exportSelectedPdf(
  recordIds: number[]
) {

  return this.http.post(

    `${environment.records.exportPdf}/selected`,

    {
      recordIds
    },

    {
      responseType: 'blob'
    }
  );
}
}