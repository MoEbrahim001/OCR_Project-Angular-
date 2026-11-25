import { Routes } from '@angular/router';

import { AppLayout } from './layout/app-layout/app-layout';
import { Dashboard } from './dashboard/dashboard';

import { RecordListComponent } from './record-list/record-list.component';
import { RecordFormComponent } from './record-form/record-form.component';


export const routes: Routes = [

  {
    path: '',
    component: AppLayout,

    children: [

      {
        path: '',
        component: Dashboard
      },

      {
        path: 'records',
        component: RecordListComponent
      },

      {
        path: 'form',
        component: RecordFormComponent
      }

    ]
  },

  {
    path: '**',
    redirectTo: ''
  }

];