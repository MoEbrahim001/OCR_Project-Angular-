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
      pageNumber?: number;
      pageSize?: number;
    }
  ) {

    const httpParams =
      new HttpParams({

        fromObject: {

          name:
            params.name
            ?? '',

          idNumber:
            params.idNumber
            ?? '',

          pageNumber:
            String(
              params.pageNumber
              ?? 1
            ),

          pageSize:
            String(
              params.pageSize
              ?? 10
            )
        }
      });


    return this.http
      .get<PagedResult<RecordModel>>(

        environment.records.search,

        {
          params:
            httpParams
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
}