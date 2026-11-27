/** One summary table — header labels + rows; the last column is the count. */
export interface TmDashboardTable {
  columns: string[]
  rows: (string | number)[][]
}

/** Shape of GET /sales/api/tm-dashboard/ */
export interface TmDashboardResponse {
  tables: {
    by_region: TmDashboardTable
    by_medrep: TmDashboardTable
    by_activeness: TmDashboardTable
    by_category: TmDashboardTable
  }
  options: {
    brands: string[]
    regions: string[]
    medreps: string[]
    activenesses: string[]
    categories: string[]
  }
  /** The filters the backend actually applied, echoed back. */
  f: Record<string, unknown>
  /** Non-empty when the user has no territory scope. */
  warning: string
  error: string
}

/** The dashboard's query params — '' means no filter (brand '' = all). */
export interface TmDashboardFilters {
  brand: string
  region: string
  medrep: string
  activeness: string
  category: string
}
