import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import{environment} from '../../environments/environments';

import { DashboardStats } from '../models/dashboardstats.model';
@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(
    private http: HttpClient
  ) {}


  getStats():
    Observable<DashboardStats> {

    return this.http.get<DashboardStats>(
      environment.dashboard.stats
    );
  }
}