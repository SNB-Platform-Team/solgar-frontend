export interface ChainSalesReportOption {
  value: string
  label: string
}

/** Static option lists echoed back on every response (used to fill the dropdowns). */
export interface ChainSalesReportOptions {
  rep_types: ChainSalesReportOption[]
  brands: ChainSalesReportOption[]
}

export interface ChainSalesReportResult {
  columns: string[]
  rows: (string | number | null)[][]
  total_rows: number
}

/** Filters as echoed back by the backend under `f`. */
export interface ChainSalesReportEchoedFilters {
  rep_type?: string
  brand?: string
  country?: string
  chain?: string
  city?: string
  product?: string
  medrep?: string
  begin?: string
  end?: string
  [key: string]: string | undefined
}

/** Shape of GET /sales/api/chain-sales-report/ */
export interface ChainSalesReportResponse {
  options: ChainSalesReportOptions
  report: ChainSalesReportResult | null
  error: string
  f: ChainSalesReportEchoedFilters
}

/** Filter form state kept on the client. */
export interface ChainSalesReportFilters {
  rep_type: string
  brand: string
  country: string
  chain: string
  city: string
  product: string
  begin: string
  end: string
}
