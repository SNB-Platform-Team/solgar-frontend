import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { authMeQueryOptions } from '@/lib/auth'
import { useCountryLock } from '@/hooks/use-country-lock'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddressMap } from '@/components/address-map'
import { BrandSpinner } from '@/components/brand-spinner'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ListSearchInput, ServerDataTable } from '@/components/data-table'
import { DateInput } from '@/components/date-input'
import { ExportExcelButton } from '@/components/export-excel-button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { FormSelect } from './form-select'
import { PharmacyHardware } from './pharmacy-hardware'
import { subtypesFor } from './promo-catalog'
import { PromoFields } from './promo-fields'
import {
  type PharmacyApiResponse,
  type PharmacyBulkSaveResponse,
  type PharmacyCascadeOptions,
  type PharmacyDetailResponse,
  type PharmacyFilterOptions,
  type PharmacyFormValues,
  type PharmacyGeocodeResponse,
  type PharmacyMutationResponse,
} from './types'

// The backend has no "all brands" mode, so we default to SOLGAR — same
// convention as the pharm-managerial report screen. Also doubles as the
// entry form's own default Компания.
const DEFAULT_BRAND = 'SOLGAR'

// Fixed option lists for the form's enum-like fields — no API backs these,
// the values are constant. FormSelect already offers its own blank "—"
// item, so none of these repeats "" itself.
const BRAND_OPTIONS = ['SOLGAR', 'NATURES BOUNTY', 'OBF']
const ASSORTIMENT_OPTIONS = ['под заказ', 'assortiment']
const ACTIVENESS_OPTIONS = ['Актив', 'Не Актив', 'Закрыта']

// No list filter picked — the table shows every pharmacy of the brand. Keys
// are the backend's own query params.
const EMPTY_LIST_FILTERS = {
  country: '',
  area: '',
  region: '',
  city: '',
  group_company: '',
  subgroup_company: '',
  pharmacy_category: '',
  pharmacy_type: '',
  promo: '',
  pharmacy_activeness: '',
  marketing_staff: '',
}

type ListFilters = typeof EMPTY_LIST_FILTERS
const LIST_FILTER_KEYS = Object.keys(
  EMPTY_LIST_FILTERS
) as (keyof ListFilters)[]

// The list filters live in the URL — '' (nothing picked) is left out of it.
const listFiltersToSearch = (filters: Partial<ListFilters>) =>
  Object.fromEntries(
    Object.entries(filters).map(([k, v]) => [k, v || undefined])
  ) as Partial<ListFilters>

// Today as yyyy-MM-dd (local time) — Дата активации's default.
const todayISO = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

type PharmaciesSearch = Partial<ListFilters> & {
  brand?: string
  page?: number
  search?: string
}

const DEFAULT_PHARMACY_FORM: PharmacyFormValues = {
  brand: DEFAULT_BRAND,
  country: '',
  area: '',
  region: '',
  city: '',
  district: '',
  metro: '',
  group_company: '',
  subgroup_company: '',
  marketing_staff: '',
  pharmacy_category: '',
  assortiment: '',
  assortiment1: '',
  pharmacy_activeness: '',
  pharmacy_type: '',
  promo: '',
  status: 'STANDARD',
  sku: '',
  cornerNo: '',
  pharmacy_activation_date: todayISO(),
  pharmacy_response_person: '',
  pharmacy_email: '',
  pharmacy_tel: '',
  pharmacist_name_1: '',
  pharmacy_home_tel: '',
  pharmacist_name_2: '',
  pharmacy_work_tel: '',
  pharmacy_no: '',
  comments: '',
  promo_subtype: '',
  pharmacy_address: '',
  street: '',
  homenumber: '',
  point_x: '',
  point_y: '',
  full_address: '',
  country_code: '',
  building_type: '',
  administrative_area_name: '',
  sub_administrative_area_name: '',
}

// point_x/point_y are edited as plain strings (they're just number
// <Input>s) but are numeric server-side — this converts a blank string to
// null and everything else to a Number right before a create/update
// request goes out, so the backend never has to coerce it.
//
// The form's Статус is stored in the pharmacy_group column — the DB's own
// `status` is an integer soft-delete flag, so it's never sent from here.
//
// The Промо Подтип (promo_subtype) has no column of its own — it's written
// into `comments`, taking priority over Дополнительная when both are set.
function buildPharmacyPayload(form: PharmacyFormValues) {
  const toNumberOrNull = (v: string) => (v.trim() === '' ? null : Number(v))
  const { status, promo_subtype, ...rest } = form
  return {
    ...rest,
    pharmacy_group: status,
    comments: promo_subtype || form.comments,
    point_x: toNumberOrNull(form.point_x),
    point_y: toNumberOrNull(form.point_y),
  }
}

// Fields that must be filled before a card can be staged (Добавить) or
// updated (Обновить), with their form labels for the error message.
const REQUIRED_FIELDS: { key: keyof PharmacyFormValues; label: string }[] = [
  { key: 'country', label: 'Страна' },
  { key: 'area', label: 'Область' },
  { key: 'region', label: 'Регион' },
  { key: 'city', label: 'Город' },
  { key: 'group_company', label: 'Группа компаний' },
  { key: 'subgroup_company', label: 'Подгруппа' },
  { key: 'pharmacy_category', label: 'Категория' },
  { key: 'pharmacy_activeness', label: 'Активность' },
  { key: 'pharmacy_type', label: 'Тип аптеки' },
  { key: 'status', label: 'Статус' },
  { key: 'marketing_staff', label: 'Мед. представитель' },
]

const REQUIRED_KEYS = new Set(REQUIRED_FIELDS.map(({ key }) => key))

/** A form <Label> that gets a red * when `field` is in REQUIRED_FIELDS. */
function FieldLabel({
  field,
  children,
}: {
  field: keyof PharmacyFormValues
  children: ReactNode
}) {
  return (
    <Label>
      <span>
        {children}
        {REQUIRED_KEYS.has(field) && (
          <span className='text-destructive'> *</span>
        )}
      </span>
    </Label>
  )
}

/** "Заполните обязательные поля: ..." for whatever's blank, or null. */
function missingFieldsError(form: PharmacyFormValues): string | null {
  const missing = REQUIRED_FIELDS.filter(
    ({ key }) => form[key].trim() === ''
  ).map(({ label }) => label)
  return missing.length
    ? `Заполните обязательные поля: ${missing.join(', ')}`
    : null
}

const route = getRouteApi('/_authenticated/pharmacies/')

export function Pharmacies() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()

  const brand = search.brand ?? DEFAULT_BRAND
  const page = search.page ?? 1
  const query = search.search ?? ''

  // Country access is per-user — everyone but an admin is pinned to their
  // own country and can't change it (see useCountryLock). Drives the entry
  // form's own Страна field.
  const countryLock = useCountryLock()
  const locked = countryLock.locked
  // Страна can't be touched while locked — nor while the lock state itself
  // is still loading (useCountryLock reports locked: false until
  // /country-options/ answers, which would otherwise leave a brief window
  // where a locked user could pick another country).
  const countryDisabled = locked || countryLock.isLoading

  // ===== List filters (the Фильтр panel in the table's toolbar) =====
  // No apply step and no state of its own: `lf` is read from the URL search
  // params — the one value both the list query's key and its request use —
  // so every change refetches the table with exactly what's picked. Назад/
  // Вперёд keep the active filters; any change goes back to page 1.
  const lf = Object.fromEntries(
    LIST_FILTER_KEYS.map((k) => [k, search[k] ?? ''])
  ) as ListFilters
  const changeLf = (patch: Partial<ListFilters>) =>
    setSearch({ ...listFiltersToSearch(patch), page: 1 })
  // A country-locked user's list is always their own country.
  const lfCountry = locked ? countryLock.userCountry : lf.country
  // Only where the dropdowns show — the filters themselves stay in the URL.
  const [filtersOpen, setFiltersOpen] = useState(false)
  // For the Фильтр button's badge, so applied filters stay visible while the
  // panel is closed. Every filter in the URL counts (hidden ones included —
  // they still narrow the list), except a locked user's forced country.
  const activeFilterCount = LIST_FILTER_KEYS.filter(
    (k) => lf[k] && !(k === 'country' && locked)
  ).length

  // resetScroll: false — this navigate() only ever updates brand/search/
  // page within the same route, and TanStack Router's default is to scroll
  // the window back to top on every navigation (including these), which
  // yanks the list back up whenever Вперёд/Назад is clicked mid-scroll.
  const setSearch = (next: PharmaciesSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), resetScroll: false })

  // The list's own query params (minus page) — shared by the list query
  // and «Скачать в Excel», so the export is exactly what's on screen.
  const listParams = () => {
    const params = new URLSearchParams({ brand })
    if (query) params.set('search', query)
    // Blank filters aren't sent.
    Object.entries({ ...lf, country: lfCountry }).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    return params
  }

  const { data, isLoading, isPlaceholderData, error } =
    useQuery<PharmacyApiResponse>({
      // A medrep's own pharmacies are enforced server-side; these only narrow.
      queryKey: ['pharmacies', brand, page, query, lf, lfCountry],
      queryFn: async () => {
        const params = listParams()
        params.set('page', String(page))
        const res = await api.get<PharmacyApiResponse>(
          `/sales/api/pharmacy/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  const brands = data?.brands ?? [
    { value: DEFAULT_BRAND, label: DEFAULT_BRAND },
  ]

  // «Поиск по таблице» — the server-side search over all records (debounced
  // in ListSearchInput); part of the URL like the filters.
  const changeQuery = (value: string) =>
    setSearch({ page: 1, search: value || undefined })

  // «Сбросить все фильтры» — every filter (hidden ones included) and the
  // search go; only the brand stays. A locked user's country isn't a URL
  // param anyway (see lfCountry).
  const hasAnyFilter =
    query !== '' ||
    LIST_FILTER_KEYS.some((k) => lf[k] && !(k === 'country' && locked))
  const resetAllFilters = () =>
    navigate({ search: { brand: search.brand, page: 1 }, resetScroll: false })

  const changeBrand = (newBrand: string) => {
    // Each brand is its own table with its own option lists, so the filters
    // picked for the previous one no longer apply.
    setSearch({
      ...listFiltersToSearch(EMPTY_LIST_FILTERS),
      brand: newBrand,
      page: 1,
    })
  }

  // The list filter's own option lists — separate from the entry form's,
  // keyed off the list's brand and filters. These are the values actually in
  // the table, which is what its filters have to match (Промо included, where
  // the form offers the catalog instead).
  const { data: lfOptions } = useQuery<PharmacyFilterOptions>({
    queryKey: ['pharmacy-listfilter-options', brand, lfCountry],
    queryFn: async () => {
      const params = new URLSearchParams({ brand })
      if (lfCountry) params.set('country', lfCountry)
      const res = await api.get<PharmacyFilterOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
  })
  const lfCascade = (
    level: PharmacyCascadeOptions['level'],
    extra: Record<string, string>,
    enabled: boolean
  ) => ({
    queryKey: ['pharmacy-listfilter-cascade', brand, level, extra],
    queryFn: async () => {
      const params = new URLSearchParams({ brand, level, ...extra })
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled,
  })
  const { data: lfAreaOptions } = useQuery(
    lfCascade('area', { country: lfCountry }, Boolean(lfCountry))
  )
  const { data: lfRegionOptions } = useQuery(
    lfCascade(
      'region',
      { country: lfCountry, area: lf.area },
      Boolean(lfCountry && lf.area)
    )
  )
  const { data: lfCityOptions } = useQuery(
    lfCascade(
      'city',
      { country: lfCountry, area: lf.area, region: lf.region },
      Boolean(lfCountry && lf.area && lf.region)
    )
  )
  const { data: lfSubchainOptions } = useQuery(
    lfCascade(
      'subchain',
      { country: lfCountry, group_company: lf.group_company },
      Boolean(lf.group_company)
    )
  )

  // ===== Карточка аптеки (Pharmacy Entry&Update) =====

  const [form, setForm] = useState<PharmacyFormValues>(DEFAULT_PHARMACY_FORM)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  // The brand the open record was loaded under — not form.brand or the
  // list's brand, either of which can change while the card stays open.
  const [editingBrand, setEditingBrand] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formNotice, setFormNotice] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Staged-but-not-saved pharmacies — Добавить аптека pushes the current
  // form here instead of hitting the API; Сохранить flushes all of them to
  // the backend in one bulk-save request, each row routed to its own
  // brand's table. Mirrors Doctor Entry's Добавить/Сохранить flow.
  const [pendingRows, setPendingRows] = useState<PharmacyFormValues[]>([])

  const setField = <K extends keyof PharmacyFormValues>(
    key: K,
    value: PharmacyFormValues[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const resetForm = () => {
    setForm(DEFAULT_PHARMACY_FORM)
    setEditingId(null)
    setFormError(null)
  }

  const removePendingRow = (index: number) =>
    setPendingRows((prev) => prev.filter((_, i) => i !== index))

  const handleClearAll = () => {
    resetForm()
    setPendingRows([])
    setFormNotice(null)
  }

  // Компания drives every brand-scoped dropdown below (Страна included) —
  // changing it invalidates whatever was picked for all of them, since
  // SOLGAR/NATURES BOUNTY/OBF are different tables with different option
  // sets server-side.
  const setFormBrand = (value: string) =>
    setForm((prev) => ({
      ...prev,
      brand: value,
      country: '',
      area: '',
      region: '',
      city: '',
      group_company: '',
      marketing_staff: '',
      pharmacy_category: '',
      pharmacy_type: '',
      promo: '',
      promo_subtype: '',
    }))

  // Страна drives Область/Регион/Город in the form too — changing it
  // invalidates whatever was picked for them, same cascade as the filter
  // panel above.
  const setFormCountry = (value: string) =>
    setForm((prev) => ({
      ...prev,
      country: value,
      area: '',
      region: '',
      city: '',
    }))
  const setFormArea = (value: string) =>
    setForm((prev) => ({ ...prev, area: value, region: '', city: '' }))
  const setFormRegion = (value: string) =>
    setForm((prev) => ({ ...prev, region: value, city: '' }))

  // A country-locked user creates/edits pharmacies in their own country
  // only — same rule the filter panel's Страна already follows.
  const formCountry = locked ? countryLock.userCountry : form.country

  // Same idea for the form's Мед. представитель (marketing_staff): a
  // non-staff user is a medrep and only ever files pharmacies under their
  // own name (me.medrep_name, possibly '' until IT maps them — the field
  // then stays empty but still locked). Staff pick freely. Locked too while
  // /me/ is still loading.
  const meQuery = useQuery(authMeQueryOptions)
  const medrepLocked = meQuery.data?.is_staff === false
  const medrepDisabled = medrepLocked || meQuery.isLoading
  const formMarketingStaff = medrepLocked
    ? (meQuery.data?.medrep_name ?? '')
    : form.marketing_staff

  // The form as it's actually staged/sent — Страна and Мед. представитель
  // forced to their locked values where applicable.
  const lockedForm: PharmacyFormValues = {
    ...form,
    country: formCountry,
    marketing_staff: formMarketingStaff,
  }

  // The form's own dropdown lists — independent of the filter panel's,
  // keyed off the form's own draft Компания rather than the list's.
  const { data: formFilterOptions } = useQuery<PharmacyFilterOptions>({
    queryKey: ['pharmacy-form-filter-options', form.brand, formCountry],
    queryFn: async () => {
      const params = new URLSearchParams({ brand: form.brand })
      if (formCountry) params.set('country', formCountry)
      const res = await api.get<PharmacyFilterOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
  })

  const { data: formAreaOptions } = useQuery<PharmacyCascadeOptions>({
    queryKey: ['pharmacy-form-area', form.brand, formCountry],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand: form.brand,
        level: 'area',
        country: formCountry,
      })
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(formCountry),
  })

  const { data: formRegionOptions } = useQuery<PharmacyCascadeOptions>({
    queryKey: ['pharmacy-form-region', form.brand, formCountry, form.area],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand: form.brand,
        level: 'region',
        country: formCountry,
        area: form.area,
      })
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(formCountry && form.area),
  })

  const { data: formCityOptions } = useQuery<PharmacyCascadeOptions>({
    queryKey: [
      'pharmacy-form-city',
      form.brand,
      formCountry,
      form.area,
      form.region,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand: form.brand,
        level: 'city',
        country: formCountry,
        area: form.area,
        region: form.region,
      })
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(formCountry && form.area && form.region),
  })

  const { data: formSubchainOptions } = useQuery<PharmacyCascadeOptions>({
    queryKey: [
      'pharmacy-form-subchain',
      form.brand,
      formCountry,
      form.group_company,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand: form.brand,
        level: 'subchain',
        group_company: form.group_company,
      })
      if (formCountry) params.set('country', formCountry)
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(formCountry),
  })

  const { data: formMetroOptions } = useQuery<PharmacyCascadeOptions>({
    queryKey: ['pharmacy-form-metro', form.brand, form.city],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand: form.brand,
        level: 'metro',
        city: form.city,
      })
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(form.city),
  })

  // Row click (Result grid, below) → detail lookup → fills the form for
  // editing. See PharmacyApiResponse: row[0]/columns[0] is the pharmacy's
  // id, same convention as Doctor Entry; the record's brand is whichever
  // brand the list is currently showing (a single brand at a time).
  const detailMutation = useMutation({
    mutationFn: async ({ brand: b, id }: { brand: string; id: string }) => {
      const params = new URLSearchParams({ brand: b, id })
      const res = await api.get<PharmacyDetailResponse>(
        `/sales/api/pharmacy/detail/?${params}`
      )
      return { ...res.data, _brand: b }
    },
    onSuccess: (data) => {
      if (data.error || data.id == null) {
        setFormError(data.error || 'Не удалось загрузить карточку аптеки')
        return
      }
      setForm({
        brand: data.brand ?? data._brand,
        country: data.country ?? '',
        area: data.area ?? '',
        region: data.region ?? '',
        city: data.city ?? '',
        district: data.district ?? '',
        metro: data.metro ?? '',
        group_company: data.group_company ?? '',
        subgroup_company: data.subgroup_company ?? '',
        marketing_staff: data.marketing_staff ?? '',
        pharmacy_category: data.pharmacy_category ?? '',
        assortiment: data.assortiment ?? '',
        assortiment1: data.assortiment1 ?? '',
        pharmacy_activeness: data.pharmacy_activeness ?? '',
        pharmacy_type: data.pharmacy_type ?? '',
        promo: data.promo ?? '',
        status: data.pharmacy_group ?? '',
        sku: data.sku ?? '',
        cornerNo: data.cornerNo ?? '',
        pharmacy_activation_date: data.pharmacy_activation_date ?? '',
        pharmacy_response_person: data.pharmacy_response_person ?? '',
        pharmacy_email: data.pharmacy_email ?? '',
        pharmacy_tel: data.pharmacy_tel ?? '',
        pharmacist_name_1: data.pharmacist_name_1 ?? '',
        pharmacy_home_tel: data.pharmacy_home_tel ?? '',
        pharmacist_name_2: data.pharmacist_name_2 ?? '',
        pharmacy_work_tel: data.pharmacy_work_tel ?? '',
        pharmacy_no: data.pharmacy_no ?? '',
        comments: data.comments ?? '',
        // A Подтип was saved into comments — restore it only if it really
        // is one of this Промо's subtypes (otherwise comments is just free
        // text from Дополнительная).
        promo_subtype: subtypesFor(data.promo ?? '').some(
          (s) => s.name === data.comments
        )
          ? (data.comments ?? '')
          : '',
        pharmacy_address: data.pharmacy_address ?? '',
        street: data.street ?? '',
        homenumber: data.homenumber ?? '',
        point_x: data.point_x != null ? String(data.point_x) : '',
        point_y: data.point_y != null ? String(data.point_y) : '',
        full_address: data.full_address ?? '',
        country_code: data.country_code ?? '',
        building_type: data.building_type ?? '',
        administrative_area_name: data.administrative_area_name ?? '',
        sub_administrative_area_name: data.sub_administrative_area_name ?? '',
      })
      setEditingId(data.id)
      setEditingBrand(data._brand)
      setFormError(null)
      setFormNotice(null)
    },
  })

  // "Найти адрес" — sends whatever's typed into Полный адрес to DaData and
  // fills in the coordinates + address components it resolves. Doesn't
  // touch anything outside the Адрес group (Область/Регион above are
  // separate, filter-options-backed cascade fields; this doesn't try to
  // reconcile the two) — same convention as Doctor Entry, same endpoint.
  const geocodeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<PharmacyGeocodeResponse>(
        '/sales/api/doctor/geocode/',
        { address: form.full_address }
      )
      return res.data
    },
    onSuccess: (data) => {
      if (data.error) {
        setFormError(data.error || 'Адрес не найден')
        return
      }
      setForm((prev) => ({
        ...prev,
        point_x: data.point_x != null ? String(data.point_x) : prev.point_x,
        point_y: data.point_y != null ? String(data.point_y) : prev.point_y,
        full_address: data.full_address ?? prev.full_address,
        // Адрес аптеки has no input of its own any more — it just follows
        // the found address, so the list's PHARMACY ADDRESS column stays in
        // step. Untouched (= the loaded value) unless an address is found;
        // a blank one is filled from full_address server-side on save.
        pharmacy_address: data.full_address ?? prev.pharmacy_address,
        street: data.street ?? prev.street,
        homenumber: data.home_number ?? prev.homenumber,
        // The geocoder's own area names go to their own columns — the
        // Страна/Область/Регион/Город cascade dropdowns are left exactly as
        // the user picked them.
        administrative_area_name:
          data.administrative_area_name ?? prev.administrative_area_name,
        sub_administrative_area_name:
          data.sub_administrative_area_name ??
          prev.sub_administrative_area_name,
        country_code: data.country_code ?? prev.country_code,
        building_type: data.building_type ?? prev.building_type,
      }))
      setFormError(null)
    },
  })

  // Сохранить — flushes every staged (Добавить аптека'd) row to the
  // backend in one request, each routed to its own brand's table
  // server-side. {rows: [...]} in, {created, updated} out.
  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      const rows = pendingRows.map((row) => buildPharmacyPayload(row))
      const res = await api.post<PharmacyBulkSaveResponse>(
        '/sales/api/pharmacy/bulk-save/',
        { rows }
      )
      return res.data
    },
    onSuccess: (data) => {
      if (data.error) {
        setFormError(data.error)
        return
      }
      setFormNotice(
        `Сохранено: добавлено ${data.created}, обновлено ${data.updated}`
      )
      setPendingRows([])
      queryClient.invalidateQueries({ queryKey: ['pharmacies'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        id: editingId,
        ...buildPharmacyPayload(lockedForm),
      }
      const res = await api.post<PharmacyMutationResponse>(
        '/sales/api/pharmacy/update/',
        payload
      )
      return res.data
    },
    onSuccess: (data) => {
      if (data.error) {
        setFormError(data.error)
        return
      }
      setFormNotice('Карточка аптеки обновлена')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['pharmacies'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<PharmacyMutationResponse>(
        '/sales/api/pharmacy/delete/',
        { brand: form.brand, id: editingId }
      )
      return res.data
    },
    onSuccess: (data) => {
      setDeleteConfirmOpen(false)
      if (data.error) {
        setFormError(data.error)
        return
      }
      setFormNotice('Аптека удалена')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['pharmacies'] })
    },
  })

  // Добавить аптека — stages the form as a not-yet-saved row instead of
  // calling the API, and clears the form for the next pharmacy. Сохранить
  // (below) is what actually writes staged rows to the DB.
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setFormNotice(null)
    const missing = missingFieldsError(lockedForm)
    if (missing) {
      setFormError(missing)
      return
    }
    setFormError(null)
    setPendingRows((prev) => [...prev, lockedForm])
    resetForm()
  }

  const handleSaveAll = () => {
    setFormNotice(null)
    setFormError(null)
    bulkSaveMutation.mutate()
  }

  const handleUpdate = () => {
    setFormNotice(null)
    const missing = missingFieldsError(lockedForm)
    if (missing) {
      setFormError(missing)
      return
    }
    setFormError(null)
    updateMutation.mutate()
  }

  const handleRowClick = (id: string) => {
    if (!id) return
    setFormNotice(null)
    detailMutation.mutate({ brand, id })
  }

  const handleGeocode = () => {
    setFormNotice(null)
    if (!form.full_address.trim()) {
      setFormError('Введите адрес для поиска')
      return
    }
    setFormError(null)
    geocodeMutation.mutate()
  }

  const isEditing = editingId !== null
  // «ID аптеки» — the legacy pharmacy_id from the detail response (not the
  // admin-only corner-log), so every user who opens the card sees it.
  const detailPharmacyId = detailMutation.data?.pharmacy_id || '—'
  const formBusy =
    detailMutation.isPending ||
    geocodeMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkSaveMutation.isPending

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-4'>
          <h1 className='text-2xl font-bold tracking-tight'>Аптеки</h1>
          <p className='text-muted-foreground'>Реестр аптек-партнёров</p>
        </div>

        {/* ===== Карточка аптеки — form on top, Java's Pharmacy Entry&Update ===== */}
        <Card className='mb-4'>
          <CardHeader>
            <CardTitle className='text-base'>Карточка аптеки</CardTitle>
            <CardDescription>
              {isEditing
                ? `Редактирование записи (ID ${editingId})`
                : 'Новая запись — заполните форму и нажмите «Добавить аптека»'}
            </CardDescription>
            {isEditing && (
              <CardDescription className='text-xs'>
                ID аптеки:{' '}
                <span className='font-medium text-foreground'>
                  {detailPharmacyId}
                </span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className='space-y-6'>
              <fieldset disabled={formBusy} className='space-y-6'>
                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-muted-foreground'>
                    Global Address
                  </h3>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <div className='space-y-1.5'>
                      <Label>Компания</Label>
                      <FormSelect
                        value={form.brand}
                        options={BRAND_OPTIONS}
                        onChange={setFormBrand}
                        placeholder='Выберите компанию'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <FieldLabel field='country'>Страна</FieldLabel>
                      {isEditing ? (
                        <Input
                          value={formCountry}
                          disabled
                          readOnly
                          className='disabled:opacity-70'
                        />
                      ) : (
                        <FormSelect
                          value={formCountry}
                          options={
                            locked
                              ? [countryLock.userCountry]
                              : (formFilterOptions?.countries ?? [])
                          }
                          disabled={countryDisabled}
                          onChange={setFormCountry}
                        />
                      )}
                    </div>
                    <div className='space-y-1.5'>
                      <FieldLabel field='area'>Область</FieldLabel>
                      {isEditing ? (
                        <Input
                          value={form.area}
                          disabled
                          readOnly
                          className='disabled:opacity-70'
                        />
                      ) : (
                        <FormSelect
                          value={form.area}
                          options={formAreaOptions?.options ?? []}
                          disabled={!formCountry && !form.area}
                          placeholder={
                            formCountry
                              ? 'Не выбрано'
                              : 'Сначала выберите страну'
                          }
                          onChange={setFormArea}
                        />
                      )}
                    </div>
                    <div className='space-y-1.5'>
                      <FieldLabel field='region'>Регион</FieldLabel>
                      {isEditing ? (
                        <Input
                          value={form.region}
                          disabled
                          readOnly
                          className='disabled:opacity-70'
                        />
                      ) : (
                        <FormSelect
                          value={form.region}
                          options={formRegionOptions?.options ?? []}
                          disabled={!form.area && !form.region}
                          placeholder={
                            form.area
                              ? 'Не выбрано'
                              : 'Сначала выберите область'
                          }
                          onChange={setFormRegion}
                        />
                      )}
                    </div>
                    <div className='space-y-1.5'>
                      <FieldLabel field='city'>Город</FieldLabel>
                      {isEditing ? (
                        <Input
                          value={form.city}
                          disabled
                          readOnly
                          className='disabled:opacity-70'
                        />
                      ) : (
                        <FormSelect
                          value={form.city}
                          options={formCityOptions?.options ?? []}
                          disabled={!form.region && !form.city}
                          placeholder={
                            form.region
                              ? 'Не выбрано'
                              : 'Сначала выберите регион'
                          }
                          onChange={(v) => setField('city', v)}
                        />
                      )}
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Округ</Label>
                      <Input
                        value={form.district}
                        onChange={(e) => setField('district', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Метро</Label>
                      <FormSelect
                        value={form.metro}
                        options={formMetroOptions?.options ?? []}
                        disabled={!form.city && !form.metro}
                        placeholder={
                          form.city ? 'Не выбрано' : 'Сначала выберите город'
                        }
                        onChange={(v) => setField('metro', v)}
                      />
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-muted-foreground'>
                    Pharm Info
                  </h3>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <div className='space-y-1.5'>
                      <FieldLabel field='group_company'>
                        Группа компаний
                      </FieldLabel>
                      <FormSelect
                        value={form.group_company}
                        options={formFilterOptions?.chains ?? []}
                        onChange={(v) =>
                          setForm((prev) => ({
                            ...prev,
                            group_company: v,
                            subgroup_company: '',
                          }))
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <FieldLabel field='subgroup_company'>
                        Подгруппа
                      </FieldLabel>
                      {isEditing ? (
                        <Input
                          value={form.subgroup_company}
                          disabled
                          readOnly
                          className='disabled:opacity-70'
                        />
                      ) : (
                        <FormSelect
                          value={form.subgroup_company}
                          options={formSubchainOptions?.options ?? []}
                          disabled={!formCountry && !form.subgroup_company}
                          placeholder={
                            formCountry
                              ? 'Не выбрано'
                              : 'Сначала выберите страну'
                          }
                          onChange={(v) => setField('subgroup_company', v)}
                        />
                      )}
                    </div>
                    <div className='space-y-1.5'>
                      <FieldLabel field='marketing_staff'>
                        Мед. представитель
                      </FieldLabel>
                      <FormSelect
                        value={formMarketingStaff}
                        options={
                          medrepLocked
                            ? [formMarketingStaff].filter(Boolean)
                            : (formFilterOptions?.marketing_staff ?? [])
                        }
                        disabled={medrepDisabled}
                        onChange={(v) => setField('marketing_staff', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <FieldLabel field='pharmacy_category'>
                        Категория
                      </FieldLabel>
                      <FormSelect
                        value={form.pharmacy_category}
                        options={formFilterOptions?.categories ?? []}
                        onChange={(v) => setField('pharmacy_category', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Ассортимент</Label>
                      <FormSelect
                        value={form.assortiment}
                        options={
                          formFilterOptions?.assortiments ?? ASSORTIMENT_OPTIONS
                        }
                        onChange={(v) => setField('assortiment', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>OBF</Label>
                      <FormSelect
                        value={form.assortiment1}
                        options={ASSORTIMENT_OPTIONS}
                        onChange={(v) => setField('assortiment1', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <FieldLabel field='pharmacy_activeness'>
                        Активность
                      </FieldLabel>
                      <FormSelect
                        value={form.pharmacy_activeness}
                        options={ACTIVENESS_OPTIONS}
                        onChange={(v) => setField('pharmacy_activeness', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <FieldLabel field='pharmacy_type'>Тип аптеки</FieldLabel>
                      <FormSelect
                        value={form.pharmacy_type}
                        options={formFilterOptions?.types ?? []}
                        onChange={(v) => setField('pharmacy_type', v)}
                      />
                    </div>
                    <PromoFields
                      promo={form.promo}
                      subtype={form.promo_subtype}
                      onPromoChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          promo: v,
                          promo_subtype: '',
                        }))
                      }
                      onSubtypeChange={(v) => setField('promo_subtype', v)}
                    />
                    <div className='space-y-1.5'>
                      <FieldLabel field='status'>Статус</FieldLabel>
                      <FormSelect
                        value={form.status}
                        options={formFilterOptions?.statuses ?? ['STANDARD']}
                        onChange={(v) => setField('status', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>SKU</Label>
                      <FormSelect
                        value={form.sku}
                        options={formFilterOptions?.skus ?? []}
                        onChange={(v) => setField('sku', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Корнер номер</Label>
                      <Input
                        value={form.cornerNo}
                        onChange={(e) => setField('cornerNo', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Дата активации</Label>
                      <DateInput
                        value={form.pharmacy_activation_date}
                        onChange={(v) =>
                          setField('pharmacy_activation_date', v)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>ФИО Заведующей</Label>
                      <Input
                        value={form.pharmacy_response_person}
                        onChange={(e) =>
                          setField('pharmacy_response_person', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Эл. адрес</Label>
                      <Input
                        type='email'
                        value={form.pharmacy_email}
                        onChange={(e) =>
                          setField('pharmacy_email', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Фармацевт Моб</Label>
                      <Input
                        type='tel'
                        value={form.pharmacy_tel}
                        onChange={(e) =>
                          setField('pharmacy_tel', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>ФИО Фармацевт 1</Label>
                      <Input
                        value={form.pharmacist_name_1}
                        onChange={(e) =>
                          setField('pharmacist_name_1', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Фармацевт Раб</Label>
                      <Input
                        type='tel'
                        value={form.pharmacy_home_tel}
                        onChange={(e) =>
                          setField('pharmacy_home_tel', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>ФИО Фармацевт 2</Label>
                      <Input
                        value={form.pharmacist_name_2}
                        onChange={(e) =>
                          setField('pharmacist_name_2', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Фармацевт Дом</Label>
                      <Input
                        type='tel'
                        value={form.pharmacy_work_tel}
                        onChange={(e) =>
                          setField('pharmacy_work_tel', e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-muted-foreground'>
                    Адрес аптеки Информация
                  </h3>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <div className='space-y-1.5'>
                      <Label>Номер Аптека</Label>
                      <Input
                        value={form.pharmacy_no}
                        onChange={(e) =>
                          setField('pharmacy_no', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Дополнительная</Label>
                      <Input
                        value={form.comments}
                        onChange={(e) => setField('comments', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-muted-foreground'>
                    Адрес
                  </h3>
                  <div className='space-y-1.5'>
                    <Label>Полный адрес</Label>
                    <div className='flex flex-col gap-2 sm:flex-row'>
                      <Input
                        value={form.full_address}
                        onChange={(e) =>
                          setField('full_address', e.target.value)
                        }
                        placeholder='Введите адрес аптеки и нажмите «Найти адрес»'
                        className='flex-1'
                      />
                      <Button
                        type='button'
                        variant='outline'
                        onClick={handleGeocode}
                        disabled={formBusy}
                        className='sm:w-auto'
                      >
                        {geocodeMutation.isPending && (
                          <BrandSpinner size={16} />
                        )}
                        Найти адрес
                      </Button>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Единственное редактируемое поле здесь. Заполняет
                      Официальный адрес, Улицу, Дом, Область, Подрайон,
                      point_x/point_y, код страны и тип здания ниже по
                      найденному адресу — эти поля недоступны для ручного ввода
                      и берутся только из результата геокодирования.
                    </p>
                  </div>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <div className='space-y-1.5'>
                      <Label>Улица</Label>
                      <Input
                        value={form.street}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Домашний номер</Label>
                      <Input
                        value={form.homenumber}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Область (Administrative)</Label>
                      <Input
                        value={form.administrative_area_name}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Подрайон (Sub-administrative)</Label>
                      <Input
                        value={form.sub_administrative_area_name}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>point_x</Label>
                      <Input
                        type='number'
                        step='any'
                        value={form.point_x}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>point_y</Label>
                      <Input
                        type='number'
                        step='any'
                        value={form.point_y}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Код страны</Label>
                      <Input
                        value={form.country_code}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Тип здания</Label>
                      <Input
                        value={form.building_type}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Карта (клик — поставить точку)</Label>
                    <AddressMap
                      pointX={form.point_x}
                      pointY={form.point_y}
                      onPick={(lat, lng) =>
                        setForm((prev) => ({
                          ...prev,
                          point_x: String(lng),
                          point_y: String(lat),
                        }))
                      }
                    />
                  </div>
                </div>
              </fieldset>

              {formError && (
                <Alert variant='destructive'>
                  <AlertCircle />
                  <AlertTitle>{formError}</AlertTitle>
                </Alert>
              )}

              {formNotice && (
                <Alert className='border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'>
                  <CheckCircle2 />
                  <AlertTitle>{formNotice}</AlertTitle>
                </Alert>
              )}

              <div className='flex flex-wrap items-center justify-end gap-2'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={handleClearAll}
                  disabled={formBusy}
                >
                  Очистить
                </Button>
                <Button
                  type='button'
                  variant='destructive'
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={!isEditing || formBusy}
                >
                  {deleteMutation.isPending && <BrandSpinner size={16} />}
                  Удалить
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleUpdate}
                  disabled={!isEditing || formBusy}
                >
                  {updateMutation.isPending && <BrandSpinner size={16} />}
                  Обновить
                </Button>
                <Button type='submit' disabled={isEditing || formBusy}>
                  Добавить аптека
                </Button>
                <Button
                  type='button'
                  onClick={handleSaveAll}
                  disabled={pendingRows.length === 0 || formBusy}
                >
                  {bulkSaveMutation.isPending && <BrandSpinner size={16} />}
                  Сохранить ({pendingRows.length})
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ===== Несохранённые записи — staged by Добавить аптека, written
            to the DB together by Сохранить ===== */}
        {pendingRows.length > 0 && (
          <Card className='mb-4 border-amber-500/40'>
            <CardHeader>
              <CardTitle className='text-base'>
                Несохранённые записи ({pendingRows.length})
              </CardTitle>
              <CardDescription>
                Добавлены локально — нажмите «Сохранить» в карточке выше, чтобы
                записать их в базу
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='overflow-x-auto rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Компания</TableHead>
                      <TableHead>Номер аптеки</TableHead>
                      <TableHead>Сеть</TableHead>
                      <TableHead>Город</TableHead>
                      <TableHead>Адрес</TableHead>
                      <TableHead className='w-10' />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRows.map((row, idx) => (
                      <TableRow key={idx} className='bg-amber-500/10'>
                        <TableCell>{row.brand}</TableCell>
                        <TableCell>{row.pharmacy_no}</TableCell>
                        <TableCell>{row.group_company}</TableCell>
                        <TableCell>{row.city}</TableCell>
                        <TableCell>{row.pharmacy_address}</TableCell>
                        <TableCell>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removePendingRow(idx)}
                            disabled={formBusy}
                          >
                            <X className='size-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          handleConfirm={() => deleteMutation.mutate()}
          destructive
          isLoading={deleteMutation.isPending}
          title='Удалить аптеку?'
          desc={
            <>
              Вы уверены, что хотите удалить «
              {form.pharmacy_no || `ID ${editingId}`}»? Это действие нельзя
              отменить.
            </>
          }
          confirmText='Удалить'
          cancelBtnText='Отмена'
        />

        {/* Follows the record opened from the list below: shown once a row
            is picked, gone again when the form is cleared. Temporarily
            staff/superuser only — not ready for everyone yet. */}
        {editingId !== null &&
          (meQuery.data?.is_superuser || meQuery.data?.is_staff) && (
            <PharmacyHardware
              key={`${editingBrand}-${editingId}`}
              brand={editingBrand}
              pharmacyId={editingId}
              title={
                [form.group_company, form.city].filter(Boolean).join(', ') ||
                `ID ${editingId}`
              }
            />
          )}

        <Card>
          <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-3 space-y-0'>
            <CardDescription>
              {data ? (
                <>
                  Всего:{' '}
                  <span className='font-medium text-foreground'>
                    {data.total_rows}
                  </span>{' '}
                  · Страница {data.page} из {data.num_pages} · нажмите на
                  строку, чтобы открыть карточку аптеки
                </>
              ) : (
                <Skeleton className='h-4 w-40' />
              )}
            </CardDescription>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant={filtersOpen ? 'secondary' : 'outline'}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <ListFilter className='size-4' />
                Фильтр
                {activeFilterCount > 0 && (
                  <span className='flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground'>
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button
                type='button'
                variant='ghost'
                disabled={!hasAnyFilter}
                onClick={resetAllFilters}
              >
                <X className='size-4' />
                Сбросить все фильтры
              </Button>
              <ExportExcelButton
                getUrl={() => `/sales/api/pharmacy/export/?${listParams()}`}
                fallbackName='apteki.xlsx'
              />
              <Select value={brand} onValueChange={changeBrand}>
                <SelectTrigger className='w-44'>
                  <SelectValue placeholder='Компания' />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Behind the Фильтр button. Each change re-queries the table
                below through the URL, as before. */}
            {filtersOpen && (
              <div className='basis-full space-y-4 rounded-md border bg-muted/30 p-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                  <div className='space-y-1.5'>
                    <Label>Страна</Label>
                    <FormSelect
                      value={lfCountry}
                      options={
                        locked
                          ? [countryLock.userCountry]
                          : (lfOptions?.countries ?? [])
                      }
                      disabled={countryDisabled}
                      onChange={(v) =>
                        changeLf({
                          country: v,
                          area: '',
                          region: '',
                          city: '',
                          group_company: '',
                          subgroup_company: '',
                        })
                      }
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Область</Label>
                    <FormSelect
                      value={lf.area}
                      options={lfAreaOptions?.options ?? []}
                      disabled={!lfCountry}
                      onChange={(v) =>
                        changeLf({ area: v, region: '', city: '' })
                      }
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Регион</Label>
                    <FormSelect
                      value={lf.region}
                      options={lfRegionOptions?.options ?? []}
                      disabled={!lf.area}
                      onChange={(v) => changeLf({ region: v, city: '' })}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Город</Label>
                    <FormSelect
                      value={lf.city}
                      options={lfCityOptions?.options ?? []}
                      disabled={!lf.region}
                      onChange={(v) => changeLf({ city: v })}
                    />
                  </div>
                  {!medrepLocked && (
                    <div className='space-y-1.5'>
                      <Label>Мед. представитель</Label>
                      <FormSelect
                        value={lf.marketing_staff}
                        options={lfOptions?.marketing_staff ?? []}
                        onChange={(v) => changeLf({ marketing_staff: v })}
                      />
                    </div>
                  )}
                  <div className='space-y-1.5'>
                    <Label>Группа компаний</Label>
                    <FormSelect
                      value={lf.group_company}
                      options={lfOptions?.chains ?? []}
                      onChange={(v) =>
                        changeLf({ group_company: v, subgroup_company: '' })
                      }
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Подгруппа</Label>
                    <FormSelect
                      value={lf.subgroup_company}
                      options={lfSubchainOptions?.options ?? []}
                      disabled={!lf.group_company}
                      onChange={(v) => changeLf({ subgroup_company: v })}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className='mb-3'>
              <ListSearchInput value={query} onChange={changeQuery} />
            </div>
            {error ? (
              <div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
                Ошибка загрузки данных
              </div>
            ) : isLoading ? (
              <div className='flex items-center justify-center py-16'>
                <BrandSpinner size={48} label='Загрузка данных' />
              </div>
            ) : data && data.rows.length > 0 ? (
              <ServerDataTable
                columns={data.columns}
                rows={data.rows}
                selectedId={editingId}
                onRowClick={handleRowClick}
                dimmed={isPlaceholderData}
                detailsTitle='Детали записи — аптека'
              />
            ) : (
              <div className='py-16 text-center text-muted-foreground italic'>
                Нет данных
              </div>
            )}

            {data && data.num_pages > 1 && (
              <div className='mt-4 flex items-center justify-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={!data.has_prev}
                  onClick={() => setSearch({ page: page - 1 })}
                >
                  <ChevronLeft className='size-4' />
                  Назад
                </Button>
                <span className='px-4 text-sm text-muted-foreground'>
                  Страница {data.page} из {data.num_pages}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={!data.has_next}
                  onClick={() => setSearch({ page: page + 1 })}
                >
                  Вперёд
                  <ChevronRight className='size-4' />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
