import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'arabicDigits', standalone: true })
export class ArabicDigitsPipe implements PipeTransform {
  transform(value: any): string {
    const a = '٠١٢٣٤٥٦٧٨٩';
    const s = String(value ?? '');
    return s.replace(/\d/g, d => a[+d]);
  }
}
