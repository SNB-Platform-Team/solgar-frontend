export interface PharmacyBrand {
  value: string
  label: string
}

/**
 * Shape of GET /sales/api/pharmacy/?brand=&page=&search=&country=&area=&
 * region=&city=&group_company=&pharmacy_category=&pharmacy_type=&promo=&
 * marketing_staff=
 */
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

/** The independent (non-cascading) dropdown lists — GET filter-options/?brand= */
export interface PharmacyFilterOptions {
  countries: string[]
  chains: string[]
  categories: string[]
  types: string[]
  promos: string[]
  marketing_staff: string[]
}

/** One cascading level — GET filter-options/?brand=&level=&country=&area=&region= */
export interface PharmacyCascadeOptions {
  level: 'area' | 'region' | 'city'
  options: string[]
}

/**
 * The full pharmacy record as the server returns/expects it — shape of
 * GET /sales/api/pharmacy/detail/?brand=&id= (all fields, including `id`
 * and `brand`), and of the JSON body sent to .../create/ (all but `id`)
 * and .../update/ (all including `id`). point_x/point_y are genuinely
 * numeric server-side, so the detail response may hand them back as
 * either — see PharmacyFormValues for the form's own (always-string)
 * versions of them.
 */
export interface PharmacyDetail {
  id: string | number
  // Global Address
  brand: string
  country: string
  area: string
  region: string
  city: string
  district: string
  metro: string
  // Pharm Info
  group_company: string
  subgroup_company: string
  marketing_staff: string
  pharmacy_category: string
  assortiment: string
  assortiment1: string
  activeness: string
  pharmacy_type: string
  promo: string
  status: string
  sku: string
  cornerNo: string
  pharmacy_activation_date: string
  pharmacy_response_person: string
  pharmacy_email: string
  pharmacy_tel: string
  pharmacist_name_1: string
  pharmacy_home_tel: string
  pharmacist_name_2: string
  pharmacy_work_tel: string
  // Адрес аптеки Информация
  pharmacy_no: string
  comments: string
  pharmacy_address: string
  // Адрес — filled either by hand or by "Найти адрес" (see
  // PharmacyGeocodeResponse); full_address doubles as the query text typed
  // into that search. area/region above double as the geocode response's
  // administrative_area_name/sub_administrative_area_name targets too —
  // same convention as Doctor Entry.
  street: string
  homenumber: string
  point_x: string | number | null
  point_y: string | number | null
  full_address: string
  country_code: string
  building_type: string
}

/**
 * Editable subset of PharmacyDetail — every field the form itself owns.
 * point_x/point_y are pinned to `string` here (they're plain number
 * <Input>s); only parsed to numbers right before a create/update request
 * goes out — see buildPharmacyPayload.
 */
export type PharmacyFormValues = Omit<
  PharmacyDetail,
  'id' | 'point_x' | 'point_y'
> & {
  point_x: string
  point_y: string
}

/** Shape of GET /sales/api/pharmacy/detail/?brand=&id= — `error` is set
 * (and the rest of the fields may be absent) when the id doesn't resolve. */
export type PharmacyDetailResponse = Partial<PharmacyDetail> & {
  error?: string
}

/** Shape of POST /sales/api/pharmacy/create/ */
export interface PharmacyCreateResponse {
  id?: string | number
  error?: string
}

/** Shape of POST /sales/api/pharmacy/update/ and .../delete/ */
export interface PharmacyMutationResponse {
  error?: string
}

/**
 * Shape of POST /sales/api/doctor/geocode/ (DaData-backed) — same endpoint
 * Doctor Entry uses, {address} in, address components + coordinates out.
 * `error` is set (with every other field absent) when the address didn't
 * resolve to anything.
 */
export interface PharmacyGeocodeResponse {
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
