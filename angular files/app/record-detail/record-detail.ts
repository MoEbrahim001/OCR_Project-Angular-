import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecordModel } from '../models/record.model';

@Component({
  selector: 'app-record-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './record-detail.html',
  styleUrls: ['./record-detail.css']
})
export class RecordDetailComponent {
  @Input() record!: RecordModel;  // Parent passes a record object here
}
