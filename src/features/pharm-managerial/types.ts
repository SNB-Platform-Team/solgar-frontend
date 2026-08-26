export interface PharmManagerialCompType {
  value: string
  label: string
}

/** Static option lists echoed back on every response (used to fill the dropdowns). */
export interface PharmManagerialOptions {
  comp_types: PharmManagerialCompType[]
  rep_types: string[]
  parameters: string[]
}

export interface PharmManagerialReport {
  columns: string[]
  rows: (string | number | null)[][]
  total_rows: number
}

/** Filters as echoed back by the backend under `f`. */
export interface PharmManagerialEchoedFilters {
  rep_type?: string
  parameter?: string
  brand?: string
  country?: string
  region?: string
  city?: string
  chain?: string
  medrep?: string
  activeness?: string
  [key: string]: string | undefined
}

/** Shape of GET /sales/api/pharm-managerial/ */
export interface PharmManagerialResponse {
  options: PharmManagerialOptions
  report: PharmManagerialReport | null
  error: string
  f: PharmManagerialEchoedFilters
}

/** Filter form state kept on the client. */
export interface PharmManagerialFilters {
  brand: string
  rep_type: string
  parameter: string
  country: string
  region: string
  city: string
  chain: string
  medrep: string
  activeness: string
}
