import { Routes } from '@angular/router';
import { RecordListComponent } from './record-list/record-list.component';
import { RecordFormComponent } from './record-form/record-form.component';

export const routes: Routes = [{ path: '', component: RecordListComponent },
  { path: 'form', component: RecordFormComponent },
  { path: '**', redirectTo: '' }];
