export interface PharmacyBrand {
  value: string
  label: string
}

/** Shape of GET /sales/api/pharmacy/?brand=&page=&search= */
export interface PharmacyApiResponse {
  brands: PharmacyBrand[]
  brand: string
  columns: string[]
  rows: (string | number | null)[][]
  total_rows: number
  page: number
  num_pages: number
  has_prev: boolean
  has_next: boolean
  search: string
}
