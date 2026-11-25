import {
  CommonModule
} from '@angular/common';

import {
  Component,
  OnInit
} from '@angular/core';

import {
  DashboardService
} from '../services/dashboard.service';
import { DashboardStats } from '../models/dashboardstats.model';




interface GenderChartSegment {
  gender: string;

  count: number;

  percentage: number;

  color: string;

  offset: number;
}


@Component({
  selector: 'app-dashboard',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './dashboard.html',

  styleUrl:
    './dashboard.css'
})
export class Dashboard
  implements OnInit {

  stats:
    DashboardStats | null = null;

  loading = true;

  error = false;


  genderSegments:
    GenderChartSegment[] = [];


  private readonly chartColors = [
    '#4f6df5',
    '#8b5cf6',
    '#14b8a6',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#ec4899',
    '#84cc16'
  ];


  constructor(
    private dashboardService:
      DashboardService
  ) {}


  ngOnInit(): void {

    this.loadStats();
  }


 loadStats(): void {

  this.loading = true;
  this.error = false;

  this.dashboardService
    .getStats()
    .subscribe({

      next: response => {

        this.stats = {
          ...response,

          genderStats:
            response.genderStats ?? [],

          governorateStats:
            response.governorateStats ?? [],

          ageRanges:
            response.ageRanges ?? [],

          recordsByMonth:
            response.recordsByMonth ?? [],

          unknownGovernorateCount:
            response.unknownGovernorateCount ?? 0
        };

        this.buildGenderChart();

        this.loading = false;
      },

      error: error => {

        console.error(
          'Dashboard stats failed',
          error
        );

        this.error = true;
        this.loading = false;
      }

    });
}


  private buildGenderChart(): void {

    if (!this.stats) {

      this.genderSegments =
        [];

      return;
    }


    let currentOffset =
      0;


    this.genderSegments =
      this.stats.genderStats
        .map(
          (
            item,
            index
          ) => {

            const segment:
              GenderChartSegment = {

              gender:
                item.gender,

              count:
                item.count,

              percentage:
                item.percentage,

              color:
                this.chartColors[
                  index %
                  this.chartColors.length
                ],

              offset:
                currentOffset
            };


            currentOffset +=
              item.percentage;


            return segment;
          }
        );
  }


  get genderCategoryCount():
    number {

    return this.stats
      ?.genderStats
      ?.length ?? 0;
  }


  get knownGenderCount():
    number {

    if (!this.stats) {

      return 0;
    }


    return this.stats
      .genderStats
      .reduce(
        (
          total,
          item
        ) =>
          total + item.count,
        0
      );
  }


  get maxAgeCount():
    number {

    if (
      !this.stats ||
      !this.stats.ageRanges.length
    ) {

      return 1;
    }


    return Math.max(
      ...this.stats
        .ageRanges
        .map(x => x.count),
      1
    );
  }


  get maxMonthlyCount():
    number {

    if (
      !this.stats ||
      !this.stats.recordsByMonth.length
    ) {

      return 1;
    }


    return Math.max(
      ...this.stats
        .recordsByMonth
        .map(x => x.count),
      1
    );
  }


  ageBarWidth(
    count: number
  ): number {

    return (
      count /
      this.maxAgeCount
    ) * 100;
  }


  monthBarHeight(
    count: number
  ): number {

    if (count === 0) {

      return 3;
    }


    return Math.max(
      (
        count /
        this.maxMonthlyCount
      ) * 100,
      8
    );
  }


  formatMonth(
    month: string
  ): string {

    const parts =
      month.split('-');


    if (parts.length !== 2) {

      return month;
    }


    const year =
      Number(parts[0]);

    const monthNumber =
      Number(parts[1]);


    if (
      !year ||
      !monthNumber
    ) {

      return month;
    }


    const date =
      new Date(
        year,
        monthNumber - 1,
        1
      );


    return new Intl
      .DateTimeFormat(
        'en',
        {
          month: 'short',
          year: '2-digit'
        }
      )
      .format(date);
  }


  trackByGender(
    index: number,
    item: GenderChartSegment
  ): string {

    return item.gender;
  }


  trackByAge(
    index: number,
    item: {
      label: string;
      count: number;
    }
  ): string {

    return item.label;
  }


  trackByMonth(
    index: number,
    item: {
      month: string;
      count: number;
    }
  ): string {

    return item.month;
  }
get maxGovernorateCount(): number {

  const governorates =
    this.stats?.governorateStats ?? [];

  if (!governorates.length) {
    return 1;
  }

  return Math.max(
    ...governorates.map(
      x => x.count
    ),
    1
  );
}

governorateBarWidth(
  count: number
): number {

  return (
    count /
    this.maxGovernorateCount
  ) * 100;
}


trackByGovernorate(
  index: number,
  item: {
    governorate: string;
    count: number;
    percentage: number;
  }
): string {

  return item.governorate;
}
}