export interface GetBestSellingProductsFilter {
  page: number;
  limit: number;
  skip: number;
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
  stockLevel?: "low" | "out-of-stock" | "in-stock";
}
