import { useEffect, useRef, useState } from 'react'
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
import { withChanges } from '@/lib/field-changes'
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
import {
  requiredFieldProps,
  scrollToFirstInvalidField,
} from '@/components/form-field'
import { FormSelect } from '@/components/form-select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  type DoctorApiResponse,
  type DoctorBulkSaveResponse,
  type DoctorCascadeOptions,
  type DoctorDetailResponse,
  type DoctorFilterOptions,
  type DoctorGeocodeResponse,
  type DoctorFormValues,
  type DoctorMutationResponse,
} from './types'

// Unlike pharmacies, this backend defaults an empty brand to "all companies" —
// Radix Select item values can't be an empty string, so "" is mapped to this
// sentinel for the dropdown and back to "" when building the query.
const ALL_BRAND = '__ALL__'
const DEFAULT_BRAND = ''

// Fixed option lists for the enum-like form fields below — no API backs
// these, the values are constant. FormSelect already offers its own blank
// "—" item, so none of these lists repeats "" itself.
const CATEGORY_OPTIONS = ['A+', 'A', 'B', 'C']
const ACTIVENESS_OPTIONS = ['Актив', 'Не Актив', 'в процессе']
const CLINIC_STATUS_OPTIONS = ['GOLD', 'PLATINUM', 'SILVER']

// The entry form's own Компания — same two brands the Java client offers
// for a doctor card (no "OBF", unlike the Pharmacy Entry form's).
const BRAND_OPTIONS = ['SOLGAR', 'NATURES BOUNTY']
const DEFAULT_FORM_BRAND = 'SOLGAR'

// No list filter picked — the table shows every doctor of the brand.
const EMPTY_LIST_FILTERS = {
  country: '',
  /** Округ */
  area: '',
  region: '',
  city: '',
  specialty: '',
  unified_specialty: '',
  category: '',
  activeness: '',
  clinic_status: '',
  medrep: '',
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

// The filters the Фильтр panel shows — and so the only ones its badge counts.
// The rest of ListFilters still work from the URL (old links), but have no
// control any more; Сбросить clears them along with these.
const PANEL_FILTER_KEYS: (keyof ListFilters)[] = [
  'country',
  'area',
  'region',
  'city',
  'medrep',
  'unified_specialty',
  'specialty',
]

// Today as yyyy-MM-dd (local time) — Дата активации's default.
const todayISO = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

type DoctorsSearch = Partial<ListFilters> & {
  brand?: string
  page?: number
  search?: string
}

const DEFAULT_DOCTOR_FORM: DoctorFormValues = {
  brand: DEFAULT_FORM_BRAND,
  doctor_name: '',
  medrep: '',
  category: '',
  unified_specialty: '',
  specialty: '',
  position_regalia: '',
  doctor_date: todayISO(),
  activeness: '',
  doctor_tel: '',
  doctor_email: '',
  clinic_tel: '',
  clinic_status: '',
  clinic_name: '',
  clinic_name1: '',
  key_person: '',
  clinic_address: '',
  clinic_count: '',
  country: '',
  area: '',
  region: '',
  city: '',
  street: '',
  homenumber: '',
  point_x: '',
  point_y: '',
  full_address: '',
  country_code: '',
  building_type: '',
  administrative_area_name: '',
  sub_administrative_area_name: '',
  geocode_city: '',
}

// clinic_count/point_x/point_y are edited as plain strings (they're just
// text/number <Input>s) but are numeric server-side — this converts a blank
// string to null and everything else to a Number right before a
// create/update request goes out, so the backend never has to coerce it.
//
// geocode_city is display-only (the readonly Город under Адрес) — there's no
// such DB column, so it's never sent.
function buildDoctorPayload(form: DoctorFormValues) {
  const toNumberOrNull = (v: string) => (v.trim() === '' ? null : Number(v))
  const { geocode_city, ...rest } = form
  return {
    ...rest,
    clinic_count: toNumberOrNull(form.clinic_count),
    point_x: toNumberOrNull(form.point_x),
    point_y: toNumberOrNull(form.point_y),
  }
}

// Fields that must be filled before a card can be staged (Добавить) or
// updated (Обновить), with their form labels for the error message.
// Должность / Название 1 / Ключевой человек / Количество stay optional.
const REQUIRED_FIELDS: { key: keyof DoctorFormValues; label: string }[] = [
  { key: 'brand', label: 'Компания' },
  { key: 'country', label: 'Страна' },
  { key: 'area', label: 'Область' },
  { key: 'region', label: 'Регион' },
  { key: 'city', label: 'Город' },
  { key: 'doctor_name', label: 'Имя доктора' },
  { key: 'medrep', label: 'Мед. представитель' },
  { key: 'category', label: 'Категория врачей' },
  { key: 'unified_specialty', label: 'Основная специальность' },
  { key: 'specialty', label: 'Специальность' },
  { key: 'activeness', label: 'Активность' },
  { key: 'clinic_tel', label: 'Телефон клиники' },
  { key: 'doctor_date', label: 'Дата активации' },
  { key: 'clinic_status', label: 'Категория' },
  { key: 'clinic_name', label: 'Название' },
  { key: 'full_address', label: 'Полный адрес' },
]

const REQUIRED_KEYS = new Set(REQUIRED_FIELDS.map(({ key }) => key))

/** "Заполните обязательные поля: ..." for whatever's blank, or null. */
function missingFieldsError(form: DoctorFormValues): string | null {
  const missing = REQUIRED_FIELDS.filter(
    ({ key }) => form[key].trim() === ''
  ).map(({ label }) => label)
  return missing.length
    ? `Заполните обязательные поля: ${missing.join(', ')}`
    : null
}

const route = getRouteApi('/_authenticated/doctors/')

export function Doctors() {
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
  const setLfField = (key: keyof ListFilters, value: string) =>
    changeLf({ [key]: value })
  // Область/Регион/Город are independent of each other; Страна still
  // clears them (their picks may not exist in the new country).
  const setLfCountry = (value: string) =>
    changeLf({ country: value, area: '', region: '', city: '' })
  // Страна in the panel is never locked: a medrep's own country (me.country)
  // is only preselected — once on arrival, and again by a reset — and can be
  // changed or cleared freely. Admins (is_staff) get no default.
  const me = useQuery(authMeQueryOptions).data
  const defaultLfCountry = me && !me.is_staff ? me.country || '' : ''
  const lfCountry = lf.country
  const lfDefaultedRef = useRef(false)
  useEffect(() => {
    if (lfDefaultedRef.current || !defaultLfCountry) return
    lfDefaultedRef.current = true
    if (search.country === undefined)
      navigate({
        search: (prev) => ({ ...prev, country: defaultLfCountry }),
        replace: true,
        resetScroll: false,
      })
  }, [defaultLfCountry, search.country, navigate])
  // Only where the dropdowns show — the filters themselves stay in the URL.
  const [filtersOpen, setFiltersOpen] = useState(false)
  // For the Фильтр button's badge, so applied filters stay visible while the
  // panel is closed. A medrep's default country doesn't count.
  const activeFilterCount = PANEL_FILTER_KEYS.filter(
    (k) => lf[k] && !(k === 'country' && lf[k] === defaultLfCountry)
  ).length

  // resetScroll: false — this navigate() only ever updates brand/search/
  // page within the same route, and TanStack Router's default is to scroll
  // the window back to top on every navigation (including these), which
  // yanks the list back up whenever Вперёд/Назад is clicked mid-scroll.
  const setSearch = (next: DoctorsSearch) =>
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
    useQuery<DoctorApiResponse>({
      // A medrep's own doctors are enforced server-side; these only narrow.
      queryKey: ['doctors', brand, page, query, lf, lfCountry],
      queryFn: async () => {
        const params = listParams()
        params.set('page', String(page))
        const res = await api.get<DoctorApiResponse>(
          `/sales/api/doctor/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  // Independent dropdown lists — not brand-scoped (unlike pharmacies). Feeds
  // the entry form's Страна/Мед. представитель/Специальность/Осн.
  // специальность/Название клиники dropdowns below.
  const { data: filterOptions } = useQuery<DoctorFilterOptions>({
    queryKey: ['doctor-filter-options'],
    queryFn: async () => {
      const res = await api.get<DoctorFilterOptions>(
        '/sales/api/doctor/filter-options/'
      )
      return res.data
    },
  })

  const brands = data?.brands ?? [{ value: DEFAULT_BRAND, label: 'Все' }]

  // «Поиск по таблице» — the server-side search over all records (debounced
  // in ListSearchInput); part of the URL like the filters.
  const changeQuery = (value: string) =>
    setSearch({ page: 1, search: value || undefined })

  // «Сбросить все фильтры» — every filter (hidden ones included) and the
  // search go; only the brand stays (plus a medrep's default
  // country — see defaultLfCountry).
  const hasAnyFilter =
    query !== '' ||
    LIST_FILTER_KEYS.some(
      (k) => lf[k] && !(k === 'country' && lf[k] === defaultLfCountry)
    )
  const resetAllFilters = () =>
    navigate({
      search: {
        brand: search.brand,
        page: 1,
        country: defaultLfCountry || undefined,
      },
      resetScroll: false,
    })

  const changeBrand = (newBrand: string) => {
    setSearch({
      brand: newBrand === ALL_BRAND ? '' : newBrand,
      page: 1,
    })
  }

  // ===== Карточка врача (Doctor Entry&Update) =====

  const [form, setForm] = useState<DoctorFormValues>(DEFAULT_DOCTOR_FORM)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formNotice, setFormNotice] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Staged-but-not-saved doctors — Добавить pushes the current form here
  // instead of hitting the API; Сохранить flushes all of them to the
  // backend in one bulk-save request. Mirrors the Java client's two-stage
  // Добавить/Сохранить flow (add several cards, then commit them together).
  const [pendingRows, setPendingRows] = useState<DoctorFormValues[]>([])

  const setField = <K extends keyof DoctorFormValues>(
    key: K,
    value: DoctorFormValues[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const resetForm = () => {
    setForm(DEFAULT_DOCTOR_FORM)
    setEditingId(null)
    setFormError(null)
    setShowMissing(false)
  }

  const removePendingRow = (index: number) =>
    setPendingRows((prev) => prev.filter((_, i) => i !== index))

  const handleClearAll = () => {
    resetForm()
    setPendingRows([])
    setFormNotice(null)
  }

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

  // A country-locked user creates/edits doctors in their own country only —
  // same rule the filter panel's Страна already follows.
  const formCountry = locked ? countryLock.userCountry : form.country

  // Same idea for the form's Мед. представитель: a non-staff user is a
  // medrep and only ever files doctors under their own name (me.medrep_name,
  // possibly '' until IT maps them — the field then stays empty but still
  // locked). Staff pick freely. Locked too while /me/ is still loading.
  const meQuery = useQuery(authMeQueryOptions)
  const medrepLocked = meQuery.data?.is_staff === false
  const medrepDisabled = medrepLocked || meQuery.isLoading
  const formMedrep = medrepLocked
    ? (meQuery.data?.medrep_name ?? '')
    : form.medrep

  // The form as it's actually staged/sent/validated — Страна and Мед.
  // представитель forced to their locked values where applicable.
  const lockedForm: DoctorFormValues = {
    ...form,
    country: formCountry,
    medrep: formMedrep,
  }

  const { data: formAreaOptions } = useQuery<DoctorCascadeOptions>({
    queryKey: ['doctor-form-area', formCountry],
    queryFn: async () => {
      const params = new URLSearchParams({
        level: 'area',
        country: formCountry,
      })
      const res = await api.get<DoctorCascadeOptions>(
        `/sales/api/doctor/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(formCountry),
  })

  const { data: formRegionOptions } = useQuery<DoctorCascadeOptions>({
    queryKey: ['doctor-form-region', formCountry, form.area],
    queryFn: async () => {
      const params = new URLSearchParams({
        level: 'region',
        country: formCountry,
        area: form.area,
      })
      const res = await api.get<DoctorCascadeOptions>(
        `/sales/api/doctor/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(formCountry && form.area),
  })

  const { data: formCityOptions } = useQuery<DoctorCascadeOptions>({
    queryKey: ['doctor-form-city', formCountry, form.area, form.region],
    queryFn: async () => {
      const params = new URLSearchParams({
        level: 'city',
        country: formCountry,
        area: form.area,
        region: form.region,
      })
      const res = await api.get<DoctorCascadeOptions>(
        `/sales/api/doctor/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(formCountry && form.area && form.region),
  })

  // Row click (Result grid, below) → detail lookup → fills the form for
  // editing. See DoctorApiResponse: row[0]/columns[0] is the doctor's id.
  const detailMutation = useMutation({
    mutationFn: async (id: string) => {
      const params = new URLSearchParams({ id })
      const res = await api.get<DoctorDetailResponse>(
        `/sales/api/doctor/detail/?${params}`
      )
      return res.data
    },
    onSuccess: (data) => {
      if (data.error || data.id == null) {
        setFormError(data.error || 'Не удалось загрузить карточку врача')
        return
      }
      setForm({
        brand: data.brand ?? '',
        doctor_name: data.doctor_name ?? '',
        medrep: data.medrep ?? '',
        category: data.category ?? '',
        unified_specialty: data.unified_specialty ?? '',
        specialty: data.specialty ?? '',
        position_regalia: data.position_regalia ?? '',
        doctor_date: data.doctor_date ?? '',
        activeness: data.activeness ?? '',
        doctor_tel: data.doctor_tel ?? '',
        doctor_email: data.doctor_email ?? '',
        clinic_tel: data.clinic_tel ?? '',
        clinic_status: data.clinic_status ?? '',
        clinic_name: data.clinic_name ?? '',
        clinic_name1: data.clinic_name1 ?? '',
        key_person: data.key_person ?? '',
        clinic_address: data.clinic_address ?? '',
        clinic_count:
          data.clinic_count != null ? String(data.clinic_count) : '',
        country: data.country ?? '',
        area: data.area ?? '',
        region: data.region ?? '',
        city: data.city ?? '',
        street: data.street ?? '',
        homenumber: data.homenumber ?? '',
        point_x: data.point_x != null ? String(data.point_x) : '',
        point_y: data.point_y != null ? String(data.point_y) : '',
        full_address: data.full_address ?? '',
        country_code: data.country_code ?? '',
        building_type: data.building_type ?? '',
        administrative_area_name: data.administrative_area_name ?? '',
        sub_administrative_area_name: data.sub_administrative_area_name ?? '',
        geocode_city: data.city ?? '',
      })
      setEditingId(data.id)
      setFormError(null)
      setFormNotice(null)
    },
  })

  // "Найти адрес" — sends whatever's typed into Полный адрес to DaData and
  // fills in the coordinates + address components it resolves. Doesn't
  // touch anything outside the Адрес group (Область/Регион/Город above are
  // separate, filter-options-backed cascade fields; this doesn't try to
  // reconcile the two).
  const geocodeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<DoctorGeocodeResponse>(
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
        full_address: data.full_address || prev.full_address,
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
        geocode_city: data.city ?? prev.geocode_city,
        country_code: data.country_code ?? prev.country_code,
        building_type: data.building_type ?? prev.building_type,
      }))
      setFormError(null)
    },
  })

  // Сохранить — flushes every staged (Добавить'd) row to the backend in
  // one request. The Java client's bulk-save: {rows: [...]} in,
  // {created, updated} out.
  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      const rows = pendingRows.map((row) => buildDoctorPayload(row))
      const res = await api.post<DoctorBulkSaveResponse>(
        '/sales/api/doctor/bulk-save/',
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
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        id: editingId,
        ...buildDoctorPayload(lockedForm),
      }
      const res = await api.post<DoctorMutationResponse>(
        '/sales/api/doctor/update/',
        payload
      )
      return res.data
    },
    onSuccess: (data) => {
      if (data.error) {
        setFormError(data.error)
        return
      }
      setFormNotice(withChanges('Карточка врача обновлена', data.changes))
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<DoctorMutationResponse>(
        '/sales/api/doctor/delete/',
        { id: editingId }
      )
      return res.data
    },
    onSuccess: (data) => {
      setDeleteConfirmOpen(false)
      if (data.error) {
        setFormError(data.error)
        return
      }
      setFormNotice('Врач удалён')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
  })

  // Required-field markers: after a failed check every blank required field
  // is outlined in red (until filled) and the first one is scrolled to.
  const isMissing = (key: keyof DoctorFormValues) =>
    REQUIRED_KEYS.has(key) && lockedForm[key].trim() === ''
  const [showMissing, setShowMissing] = useState(false)
  const fieldProps = (key: keyof DoctorFormValues) =>
    requiredFieldProps(key, showMissing && isMissing(key))
  // False (with markers + the summary message) when something's blank.
  const validateForm = (): boolean => {
    const missing = missingFieldsError(lockedForm)
    if (missing) {
      setFormError(missing)
      setShowMissing(true)
      setTimeout(scrollToFirstInvalidField, 0)
      return false
    }
    setShowMissing(false)
    return true
  }

  // Добавить — stages the form as a not-yet-saved row instead of calling
  // the API, and clears the form for the next doctor. Сохранить (below)
  // is what actually writes staged rows to the DB.
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setFormNotice(null)
    if (!validateForm()) return
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
    if (!validateForm()) return
    setFormError(null)
    updateMutation.mutate()
  }

  const handleRowClick = (id: string) => {
    if (!id) return
    setFormNotice(null)
    detailMutation.mutate(id)
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
          <h1 className='text-2xl font-bold tracking-tight'>Врачи</h1>
          <p className='text-muted-foreground'>Реестр врачей</p>
        </div>

        {/* ===== Карточка врача — form on top, Java's Doctor Entry&Update ===== */}
        <Card className='mb-4'>
          <CardHeader>
            <CardTitle className='text-base'>Карточка врача</CardTitle>
            <CardDescription>
              {isEditing
                ? `Редактирование записи (ID ${editingId})`
                : 'Новая запись — заполните форму и нажмите «Добавить»'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className='space-y-6'>
              <fieldset disabled={formBusy} className='space-y-6'>
                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-muted-foreground'>
                    Компания и адрес
                  </h3>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <div className='space-y-1.5' {...fieldProps('brand')}>
                      <Label>
                        Компания <span className='text-destructive'>*</span>
                      </Label>
                      <FormSelect
                        value={form.brand}
                        options={BRAND_OPTIONS}
                        onChange={(v) => setField('brand', v)}
                        placeholder='Выберите компанию'
                      />
                    </div>
                    <div className='space-y-1.5' {...fieldProps('country')}>
                      <Label>
                        Страна <span className='text-destructive'>*</span>
                      </Label>
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
                              : (filterOptions?.countries ?? [])
                          }
                          disabled={countryDisabled}
                          onChange={setFormCountry}
                        />
                      )}
                    </div>
                    <div className='space-y-1.5' {...fieldProps('area')}>
                      <Label>
                        Область <span className='text-destructive'>*</span>
                      </Label>
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
                          requires='Страна'
                          placeholder={
                            formCountry
                              ? 'Не выбрано'
                              : 'Сначала выберите страну'
                          }
                          onChange={setFormArea}
                        />
                      )}
                    </div>
                    <div className='space-y-1.5' {...fieldProps('region')}>
                      <Label>
                        Регион <span className='text-destructive'>*</span>
                      </Label>
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
                          requires='Область'
                          placeholder={
                            form.area
                              ? 'Не выбрано'
                              : 'Сначала выберите область'
                          }
                          onChange={setFormRegion}
                        />
                      )}
                    </div>
                    <div className='space-y-1.5' {...fieldProps('city')}>
                      <Label>
                        Город <span className='text-destructive'>*</span>
                      </Label>
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
                          requires='Регион'
                          placeholder={
                            form.region
                              ? 'Не выбрано'
                              : 'Сначала выберите регион'
                          }
                          onChange={(v) => setField('city', v)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-muted-foreground'>
                    Доктор
                  </h3>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <div className='space-y-1.5' {...fieldProps('doctor_name')}>
                      <Label>
                        Имя доктора <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        value={form.doctor_name}
                        onChange={(e) =>
                          setField('doctor_name', e.target.value)
                        }
                        placeholder='ФИО доктора'
                      />
                    </div>
                    <div className='space-y-1.5' {...fieldProps('medrep')}>
                      <Label>
                        Мед. представитель{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <FormSelect
                        value={formMedrep}
                        options={
                          medrepLocked
                            ? [formMedrep].filter(Boolean)
                            : (filterOptions?.medreps ?? [])
                        }
                        disabled={medrepDisabled}
                        onChange={(v) => setField('medrep', v)}
                      />
                    </div>
                    <div className='space-y-1.5' {...fieldProps('category')}>
                      <Label>
                        Категория врачей{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <FormSelect
                        value={form.category}
                        options={CATEGORY_OPTIONS}
                        onChange={(v) => setField('category', v)}
                      />
                    </div>
                    <div
                      className='space-y-1.5'
                      {...fieldProps('unified_specialty')}
                    >
                      <Label>
                        Основная специальность{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <FormSelect
                        value={form.unified_specialty}
                        options={filterOptions?.unified_specialties ?? []}
                        onChange={(v) => setField('unified_specialty', v)}
                      />
                    </div>
                    <div className='space-y-1.5' {...fieldProps('specialty')}>
                      <Label>
                        Специальность{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <FormSelect
                        value={form.specialty}
                        options={filterOptions?.specialties ?? []}
                        onChange={(v) => setField('specialty', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Должность</Label>
                      <Input
                        value={form.position_regalia}
                        onChange={(e) =>
                          setField('position_regalia', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5' {...fieldProps('doctor_date')}>
                      <Label>
                        Дата активации{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <DateInput
                        value={form.doctor_date}
                        onChange={(v) => setField('doctor_date', v)}
                      />
                    </div>
                    <div className='space-y-1.5' {...fieldProps('activeness')}>
                      <Label>
                        Активность <span className='text-destructive'>*</span>
                      </Label>
                      <FormSelect
                        value={form.activeness}
                        options={ACTIVENESS_OPTIONS}
                        onChange={(v) => setField('activeness', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Доктор тел</Label>
                      <Input
                        type='tel'
                        value={form.doctor_tel}
                        onChange={(e) => setField('doctor_tel', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5' {...fieldProps('clinic_tel')}>
                      <Label>
                        Телефон клиники{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        type='tel'
                        value={form.clinic_tel}
                        onChange={(e) => setField('clinic_tel', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Эл. адрес</Label>
                      <Input
                        type='email'
                        value={form.doctor_email}
                        onChange={(e) =>
                          setField('doctor_email', e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-muted-foreground'>
                    Клиника
                  </h3>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <div
                      className='space-y-1.5'
                      {...fieldProps('clinic_status')}
                    >
                      <Label>
                        Категория <span className='text-destructive'>*</span>
                      </Label>
                      <FormSelect
                        value={form.clinic_status}
                        options={CLINIC_STATUS_OPTIONS}
                        onChange={(v) => setField('clinic_status', v)}
                      />
                    </div>
                    <div className='space-y-1.5' {...fieldProps('clinic_name')}>
                      <Label>
                        Название <span className='text-destructive'>*</span>
                      </Label>
                      <FormSelect
                        value={form.clinic_name}
                        options={filterOptions?.clinics ?? []}
                        onChange={(v) => setField('clinic_name', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Название 1</Label>
                      <Input
                        value={form.clinic_name1}
                        onChange={(e) =>
                          setField('clinic_name1', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Ключевой человек</Label>
                      <Input
                        value={form.key_person}
                        onChange={(e) => setField('key_person', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Количество</Label>
                      <Input
                        type='number'
                        value={form.clinic_count}
                        onChange={(e) =>
                          setField('clinic_count', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5 lg:col-span-3'>
                      <Label>Адрес клиники</Label>
                      <Input
                        value={form.clinic_address}
                        onChange={(e) =>
                          setField('clinic_address', e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <h3 className='text-sm font-semibold text-muted-foreground'>
                    Адрес
                  </h3>
                  <div className='space-y-1.5' {...fieldProps('full_address')}>
                    <Label>
                      Полный адрес <span className='text-destructive'>*</span>
                    </Label>
                    <div className='flex flex-col gap-2 sm:flex-row'>
                      <Input
                        value={form.full_address}
                        onChange={(e) =>
                          setField('full_address', e.target.value)
                        }
                        placeholder='Введите адрес клиники и нажмите «Найти адрес»'
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
                      Единственное редактируемое поле здесь. Заполняет Улицу,
                      Дом, Город, Область, Регион, point_x/point_y, код страны и
                      тип здания ниже по найденному адресу — эти поля недоступны
                      для ручного ввода и берутся только из результата
                      геокодирования.
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
                      <Label>Город</Label>
                      <Input
                        value={form.geocode_city}
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
                      <Label>Регион (Sub-administrative)</Label>
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
                  Добавить
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

        {/* ===== Несохранённые записи — staged by Добавить, written to the
            DB together by Сохранить ===== */}
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
                      <TableHead>Доктор</TableHead>
                      <TableHead>Специальность</TableHead>
                      <TableHead>Клиника</TableHead>
                      <TableHead>Город</TableHead>
                      <TableHead className='w-10' />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRows.map((row, idx) => (
                      <TableRow key={idx} className='bg-amber-500/10'>
                        <TableCell>{row.brand}</TableCell>
                        <TableCell>{row.doctor_name}</TableCell>
                        <TableCell>{row.specialty}</TableCell>
                        <TableCell>{row.clinic_name}</TableCell>
                        <TableCell>{row.city}</TableCell>
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
          title='Удалить врача?'
          desc={
            <>
              Вы уверены, что хотите удалить «
              {form.doctor_name || `ID ${editingId}`}»? Это действие нельзя
              отменить.
            </>
          }
          confirmText='Удалить'
          cancelBtnText='Отмена'
        />

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
                  строку, чтобы открыть карточку врача
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
                getUrl={() => `/sales/api/doctor/export/?${listParams()}`}
                fallbackName='vrachi.xlsx'
              />
              <Select
                value={brand === '' ? ALL_BRAND : brand}
                onValueChange={changeBrand}
              >
                <SelectTrigger className='w-44'>
                  <SelectValue placeholder='Компания' />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem
                      key={b.value || ALL_BRAND}
                      value={b.value === '' ? ALL_BRAND : b.value}
                    >
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Behind the Фильтр button. Each change re-queries the table
                below through the URL. */}
            {filtersOpen && (
              <div className='basis-full space-y-4 rounded-md border bg-muted/30 p-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                  <div className='space-y-1.5'>
                    <Label>Страна</Label>
                    <FormSelect
                      value={lfCountry}
                      options={filterOptions?.countries ?? []}
                      placeholder='Все'
                      onChange={setLfCountry}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Область</Label>
                    <FormSelect
                      value={lf.area}
                      options={filterOptions?.areas ?? []}
                      placeholder='Все'
                      onChange={(v) => setLfField('area', v)}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Регион</Label>
                    <FormSelect
                      value={lf.region}
                      options={filterOptions?.regions ?? []}
                      placeholder='Все'
                      onChange={(v) => setLfField('region', v)}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Город</Label>
                    <FormSelect
                      value={lf.city}
                      options={filterOptions?.cities ?? []}
                      placeholder='Все'
                      onChange={(v) => setLfField('city', v)}
                    />
                  </div>
                  {!medrepLocked && (
                    <div className='space-y-1.5'>
                      <Label>Мед. представитель</Label>
                      <FormSelect
                        value={lf.medrep}
                        options={filterOptions?.medreps ?? []}
                        placeholder='Все'
                        onChange={(v) => setLfField('medrep', v)}
                      />
                    </div>
                  )}
                  <div className='space-y-1.5'>
                    <Label>Основная специальность</Label>
                    <FormSelect
                      value={lf.unified_specialty}
                      options={filterOptions?.unified_specialties ?? []}
                      placeholder='Все'
                      onChange={(v) => setLfField('unified_specialty', v)}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Специальность</Label>
                    <FormSelect
                      value={lf.specialty}
                      options={filterOptions?.specialties ?? []}
                      placeholder='Все'
                      onChange={(v) => setLfField('specialty', v)}
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
                detailsTitle='Детали записи — врач'
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
