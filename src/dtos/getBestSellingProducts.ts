export interface GetBestSellingProductsFilter {
  page: number;
  limit: number;
  search?: string;
  stallId?: number;
  sortBy?:
    | "totalSold"
    | "revenue"
    | "name"
    | "stock-asc"
    | "stock-desc"
    | "price-asc"
    | "price-desc";
  date?: string; // opcional agora
}
