export interface GetBestSellingProductsFilter {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  stallId?: number;
  sortBy?: "totalSold" | "revenue" | "name";
}
