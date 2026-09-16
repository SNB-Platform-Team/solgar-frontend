export interface ChainReportBrand {
  value: string
  label: string
}

export interface ChainReportTotals {
  solgar_count: number
  solgar_amount: number
  bounty_count: number
  bounty_amount: number
}

/**
 * The dropdown lists — GET filter-options/ (country-less) or
 * GET filter-options/?country=X (regions/districts narrowed to X). The
 * endpoint also echoes a `chains` field, but that's the old, much smaller
 * ChainDefinition-backed list — Сеть is deliberately left off this type so
 * it can't get wired back in; it's sourced from usePharmacyChains instead.
 */
export interface ChainReportFilterOptions {
  countries: string[]
  regions: string[]
  districts: string[]
}

/** Filters as echoed back by the backend under `f`. */
export interface ChainReportEchoedFilters {
  brand?: string
  chain_name?: string
  country?: string
  region?: string
  district?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  [key: string]: string | number | undefined
}

/** Shape of GET /sales/api/chain-report/ */
export interface ChainReportResponse {
  brands: ChainReportBrand[]
  columns: string[]
  rows: (string | number | null)[][]
  total_rows: number
  page: number
  num_pages: number
  has_prev: boolean
  has_next: boolean
  totals: ChainReportTotals
  f: ChainReportEchoedFilters
}
