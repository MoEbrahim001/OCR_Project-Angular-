export interface DashboardStats {
  totalRecords: number;

  unknownGenderCount: number;

  unknownGovernorateCount: number;

  addedThisMonth: number;

  genderStats: GenderStat[];

  governorateStats: GovernorateStat[];

  ageRanges: AgeRangeStat[];

  recordsByMonth: MonthlyRecordStat[];
}


export interface GenderStat {
  gender: string;

  count: number;

  percentage: number;
}


export interface GovernorateStat {
  governorate: string;

  count: number;

  percentage: number;
}


export interface AgeRangeStat {
  label: string;

  count: number;
}


export interface MonthlyRecordStat {
  month: string;

  count: number;
}