export interface DistributorReportOption {
  value: string
  label: string
}

/** Static option lists echoed back on every response (used to fill the dropdowns). */
export interface DistributorReportOptions {
  rep_types: DistributorReportOption[]
  operations: DistributorReportOption[]
}

export interface DistributorReportResult {
  columns: string[]
  rows: (string | number | null)[][]
  total_rows: number
}

/** Filters as echoed back by the backend under `f`. */
export interface DistributorReportEchoedFilters {
  rep_type?: string
  operation_type?: string
  distributor?: string
  city?: string
  brand?: string
  country?: string
  product?: string
  begin?: string
  end?: string
  [key: string]: string | undefined
}

/** Shape of GET /sales/api/distributor-report/ */
export interface DistributorReportResponse {
  options: DistributorReportOptions
  report: DistributorReportResult | null
  error: string
  /** Guidance text sent while no report has been produced yet. */
  message?: string
  f: DistributorReportEchoedFilters
}

/** Filter form state kept on the client. */
export interface DistributorReportFilters {
  rep_type: string
  operation_type: string
  distributor: string
  city: string
  brand: string
  country: string
  product: string
  begin: string
  end: string
}
