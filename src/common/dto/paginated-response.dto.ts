import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'List of items in the current page', isArray: true })
  items: T[];

  @ApiProperty({ description: 'Current page number (1-indexed)', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  pageSize: number;

  @ApiProperty({ description: 'Total number of items across all pages', example: 42 })
  totalItems: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;

  constructor(items: T[], totalItems: number, page: number, pageSize: number) {
    this.items = items;
    this.totalItems = totalItems;
    this.page = page;
    this.pageSize = pageSize;
    this.totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  }
}
