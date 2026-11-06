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
  assortiments?: string[]
  skus?: string[]
  /** Статус choices for the form — country-scoped server-side. */
  statuses?: string[]
}

/** One cascading level — GET filter-options/?brand=&level=&country=&area=&region= */
export interface PharmacyCascadeOptions {
  level: 'area' | 'region' | 'city' | 'subchain'
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
  pharmacy_activeness: string
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
  // Адрес — filled by "Найти адрес" (see PharmacyGeocodeResponse);
  // full_address doubles as the query text typed into that search. The
  // geocoder's own area names live in administrative_area_name/
  // sub_administrative_area_name — separate columns from the area/region
  // cascade dropdowns above, which geocoding never touches.
  administrative_area_name: string
  sub_administrative_area_name: string
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
  /** Form-only: the Подтип picked under Промо (see promo-catalog.ts). Not
   * its own DB column — buildPharmacyPayload writes it into `comments`. */
  promo_subtype: string
}

/** Shape of GET /sales/api/pharmacy/detail/?brand=&id= — `error` is set
 * (and the rest of the fields may be absent) when the id doesn't resolve. */
export type PharmacyDetailResponse = Partial<PharmacyDetail> & {
  /** Where the form's Статус actually lives in the DB (`status` itself is
   * an integer soft-delete flag). */
  pharmacy_group?: string
  /** The legacy pharmacy id (shown as «ID аптеки»); "" when unset/0. */
  pharmacy_id?: string | number | null
  error?: string
}

/** A saved equipment photo — `url` is a ready-to-open Blob (SAS) link. */
export interface PharmacyHardwarePhoto {
  id: number
  url: string
  name: string
}

/** One Промо + Подтип pair a pharmacy has, with its statuses. */
export interface PharmacyHardwareRow {
  /** The row's id in its source table — equipment_id for "new" rows. */
  id?: number
  /** "new" — the equipment table (deletable, may have photos); "legacy" —
   * corner_info (read-only, no photos). */
  source: 'new' | 'legacy'
  /** The pharmacy's legacy pharmacy_id — the same on every row of one
   * pharmacy, and the same as the response's own pharmacy_id. */
  apteka_id?: string | number | null
  /** Empty on legacy rows: corner_info holds no Промо name. */
  promo: string
  subtype: string
  /** e.g. 180x30x20 — formatted from width/length/depth on legacy rows. */
  size?: string
  photos?: PharmacyHardwarePhoto[]
  /** 1 = Активно, 0 = Неактивно */
  status: number
  status_label: string
  /** corner_info's approve_status, as a string: "0" to "5". */
  hardware_status: string
  hardware_status_label: string
}

/** Shape of GET /sales/api/pharmacy/corner-log/?brand=&id= — existing rows. */
export interface PharmacyCornerLogResponse {
  /** The pharmacy's legacy pharmacy_id (shown as «ID аптеки»). */
  pharmacy_id: string | number | null
  rows: PharmacyHardwareRow[]
  error?: string
}

/** Shape of POST /sales/api/pharmacy/equipment/save/ — the created row. */
export interface PharmacyEquipmentSaveResponse {
  row?: PharmacyHardwareRow
  error?: string
}

/** Shape of POST /sales/api/pharmacy/equipment/delete/ */
export interface PharmacyEquipmentDeleteResponse {
  ok?: boolean
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
 * Shape of POST /sales/api/pharmacy/bulk-save/ — {rows: [...
 * PharmacyFormValues payloads]} in, one DB write per row out (routed to the
 * SOLGAR/NATURES BOUNTY/OBF table by each row's own `brand`). Mirrors the
 * Java client's Добавить аптека/Сохранить flow — same convention as
 * Doctor Entry's DoctorBulkSaveResponse.
 */
export interface PharmacyBulkSaveResponse {
  created: number
  updated: number
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
