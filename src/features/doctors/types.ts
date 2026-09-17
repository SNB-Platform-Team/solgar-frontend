export interface DoctorBrand {
  value: string
  label: string
}

/**
 * Shape of GET /sales/api/doctor/?brand=&page=&search=&country=&area=&
 * region=&city=&specialty=&unified_specialty=&medrep=
 */
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

/** The independent (non-cascading) dropdown lists — GET filter-options/ */
export interface DoctorFilterOptions {
  countries: string[]
  specialties: string[]
  unified_specialties: string[]
  medreps: string[]
}

/** One cascading level — GET filter-options/?level=&country=&area=&region= */
export interface DoctorCascadeOptions {
  level: 'area' | 'region' | 'city'
  options: string[]
}

/**
 * The full doctor record as the server returns/expects it — shape of
 * GET /sales/api/doctor/detail/?id= (all fields, including `id`), and of
 * the JSON body sent to .../create/ (all but `id`) and .../update/ (all
 * including `id`). clinic_count/point_x/point_y are genuinely numeric
 * server-side, so the detail response may hand them back as either — see
 * DoctorFormValues for the form's own (always-string) versions of them.
 */
export interface DoctorDetail {
  id: string | number
  // Компания
  brand: string
  // Доктор
  doctor_name: string
  medrep: string
  category: string
  unified_specialty: string
  specialty: string
  position_regalia: string
  doctor_date: string
  activeness: string
  doctor_tel: string
  doctor_email: string
  // Клиника
  clinic_status: string
  clinic_name: string
  clinic_name1: string
  key_person: string
  clinic_address: string
  clinic_count: string | number | null
  // Адрес — street/homenumber/point_x/point_y/full_address/country_code/
  // building_type can all be filled in either by hand or by "Найти адрес"
  // (see DoctorGeocodeResponse); full_address doubles as the query text
  // typed into that search.
  country: string
  area: string
  region: string
  city: string
  street: string
  homenumber: string
  point_x: string | number | null
  point_y: string | number | null
  full_address: string
  country_code: string
  building_type: string
}

/**
 * Editable subset of DoctorDetail — every field the form itself owns.
 * clinic_count/point_x/point_y are pinned to `string` here (they're plain
 * text/number <Input>s); only parsed to numbers right before a
 * create/update request goes out — see buildDoctorPayload.
 */
export type DoctorFormValues = Omit<
  DoctorDetail,
  'id' | 'clinic_count' | 'point_x' | 'point_y'
> & {
  clinic_count: string
  point_x: string
  point_y: string
}

/** Shape of GET /sales/api/doctor/detail/?id= — `error` is set (and the
 * rest of the fields may be absent) when the id doesn't resolve. */
export type DoctorDetailResponse = Partial<DoctorDetail> & { error?: string }

/** Shape of POST /sales/api/doctor/create/ */
export interface DoctorCreateResponse {
  id?: string | number
  error?: string
}

/** Shape of POST /sales/api/doctor/update/ and .../delete/ */
export interface DoctorMutationResponse {
  error?: string
}

/**
 * Shape of POST /sales/api/doctor/bulk-save/ — {rows: [...DoctorFormValues
 * payloads]} in, one DB write per row out. Mirrors the Java client's
 * Добавить/Сохранить flow: Добавить stages a row locally (see
 * PendingDoctorRow in the feature itself), Сохранить sends all staged rows
 * here in one request.
 */
export interface DoctorBulkSaveResponse {
  created: number
  updated: number
  error?: string
}

/**
 * Shape of POST /sales/api/doctor/geocode/ (DaData-backed) — {address}
 * in, address components + coordinates out. `error` is set (with every
 * other field absent) when the address didn't resolve to anything.
 */
export interface DoctorGeocodeResponse {
  point_x?: number | string | null
  point_y?: number | string | null
  full_address?: string
  street?: string
  home_number?: string
  city?: string
  administrative_area_name?: string
  sub_administrative_area_name?: string
  country_code?: string
  building_type?: string
  error?: string
}
