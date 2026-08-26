export interface DoctorBrand {
  value: string
  label: string
}

/** Shape of GET /sales/api/doctor/?brand=&page=&search= */
export interface DoctorApiResponse {
  brands: DoctorBrand[]
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
