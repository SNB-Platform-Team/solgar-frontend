export interface OneCTab {
  key: string
  label: string
}

/** Shape of GET /sales/api/onec/?tab=&page=&search= */
export interface OneCApiResponse {
  tabs: OneCTab[]
  tab: string
  columns: string[]
  rows: (string | number | null)[][]
  total_rows: number
  page: number
  num_pages: number
  has_prev: boolean
  has_next: boolean
  search: string
}
