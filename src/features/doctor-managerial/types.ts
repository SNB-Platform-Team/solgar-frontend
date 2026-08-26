export interface DoctorManagerialCompType {
  value: string
  label: string
}

/** Static option lists echoed back on every response (used to fill the dropdowns). */
export interface DoctorManagerialOptions {
  comp_types: DoctorManagerialCompType[]
  rep_types: string[]
  parameters: string[]
}

export interface DoctorManagerialReport {
  columns: string[]
  rows: (string | number | null)[][]
  total_rows: number
}

/** Filters as echoed back by the backend under `f`. */
export interface DoctorManagerialEchoedFilters {
  rep_type?: string
  parameter?: string
  brand?: string
  country?: string
  region?: string
  city?: string
  speciality?: string
  sub_speciality?: string
  clinic?: string
  medrep?: string
  activeness?: string
  [key: string]: string | undefined
}

/** Shape of GET /sales/api/doctor-managerial/ */
export interface DoctorManagerialResponse {
  options: DoctorManagerialOptions
  report: DoctorManagerialReport | null
  error: string
  f: DoctorManagerialEchoedFilters
}

/** Filter form state kept on the client. */
export interface DoctorManagerialFilters {
  brand: string
  rep_type: string
  parameter: string
  country: string
  region: string
  city: string
  speciality: string
  sub_speciality: string
  clinic: string
  medrep: string
  activeness: string
}
