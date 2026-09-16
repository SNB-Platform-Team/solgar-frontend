export interface SalesObsCompType {
  value: string
  label: string
}

/** Static option lists echoed back on every response (used to fill the dropdowns). */
export interface SalesObsOptions {
  chains: string[]
  countries: string[]
  main_groups: string[]
  sub_groups: string[]
}

export interface SalesObsReport {
  columns: string[]
  rows: (string | number | null)[][]
  total_rows: number
}

/**
 * One cascading level — GET filter-options/?level=&country=&area=&region=
 * (geo levels) or ?level=product_name&main_group=&sub_group= (product level).
 */
export interface SalesObsCascadeOptions {
  level: 'area' | 'region' | 'city' | 'product_name'
  options: string[]
}

/** Filters as echoed back by the backend under `f`. */
export interface SalesObsEchoedFilters {
  comp_type?: string
  begin?: string
  end?: string
  chain?: string
  country?: string
  area?: string
  region?: string
  city?: string
  main_group?: string
  sub_group?: string
  product_name?: string
  [key: string]: string | undefined
}

/** Shape of GET /sales/api/sales-obs/ */
export interface SalesObsResponse {
  comp_types: SalesObsCompType[]
  options: SalesObsOptions
  report: SalesObsReport | null
  error: string
  f: SalesObsEchoedFilters
}

/** Filter form state kept on the client. */
export interface SalesObsFilters {
  comp_type: string
  begin: string
  end: string
  chain: string
  country: string
  area: string
  region: string
  city: string
  main_group: string
  sub_group: string
  product_name: string
}
