export interface RecordModel {
  id:number;
   name: string;
  idNumber: string;
  address: string;
  dateOfBirth: string;
  age: number;
  imageDataUrl?: string | null;

  // back (optional)
  occupation?: string;
  gender?: string;
  religion?: string;
  maritalStatus?: string;
  husbandName?: string;
  expiryDate?: string;

  // images (optional)
  frontImageDataUrl?: string | null;
  backImageDataUrl?: string | null;

  // display convenience (optional)
  marital?: string;
}
