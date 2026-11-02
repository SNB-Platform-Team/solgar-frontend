import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
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
import { ServerDataTable } from '@/components/data-table'
import { DateInput } from '@/components/date-input'
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

// And for the entry form's own optional dropdowns below — "not set" is a
// legitimate value there too, just without a "Все" label attached to it.
const EMPTY = '__EMPTY__'

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

// Today as yyyy-MM-dd (local time) — Дата активации's default.
const todayISO = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

interface DoctorsSearch {
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
  { key: 'doctor_date', label: 'Дата активации' },
  { key: 'clinic_status', label: 'Категория' },
  { key: 'clinic_name', label: 'Название' },
  { key: 'doctor_tel', label: 'Доктор тел' },
  { key: 'doctor_email', label: 'Эл. адрес' },
  { key: 'full_address', label: 'Полный адрес' },
]

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

  // Local input state so typing doesn't trigger a fetch on every keystroke —
  // only submitting the form (or pressing Enter) commits `search` to the URL.
  const [searchInput, setSearchInput] = useState(query)

  // resetScroll: false — this navigate() only ever updates brand/search/
  // page within the same route, and TanStack Router's default is to scroll
  // the window back to top on every navigation (including these), which
  // yanks the list back up whenever Вперёд/Назад is clicked mid-scroll.
  const setSearch = (next: DoctorsSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), resetScroll: false })

  const { data, isLoading, isPlaceholderData, error } =
    useQuery<DoctorApiResponse>({
      // No filter params — the backend itself narrows a medrep's list to
      // their own doctors.
      queryKey: ['doctors', brand, page, query],
      queryFn: async () => {
        const params = new URLSearchParams({ brand, page: String(page) })
        if (query) params.set('search', query)
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch({ page: 1, search: searchInput || undefined })
  }

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
        // Адрес клиники is prefilled with the found address too — still
        // editable by hand afterwards.
        clinic_address: data.full_address ?? prev.clinic_address,
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
      setFormNotice('Карточка врача обновлена')
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

  // Добавить — stages the form as a not-yet-saved row instead of calling
  // the API, and clears the form for the next doctor. Сохранить (below)
  // is what actually writes staged rows to the DB.
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
                    <div className='space-y-1.5'>
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
                    <div className='space-y-1.5'>
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
                    <div className='space-y-1.5'>
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
                    <div className='space-y-1.5'>
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
                    <div className='space-y-1.5'>
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
                    <div className='space-y-1.5'>
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
                    <div className='space-y-1.5'>
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
                    <div className='space-y-1.5'>
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
                    <div className='space-y-1.5'>
                      <Label>
                        Дата активации{' '}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <DateInput
                        value={form.doctor_date}
                        onChange={(v) => setField('doctor_date', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
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
                      <Label>
                        Доктор тел <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        type='tel'
                        value={form.doctor_tel}
                        onChange={(e) => setField('doctor_tel', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>
                        Эл. адрес <span className='text-destructive'>*</span>
                      </Label>
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
                    <div className='space-y-1.5'>
                      <Label>
                        Категория <span className='text-destructive'>*</span>
                      </Label>
                      <FormSelect
                        value={form.clinic_status}
                        options={CLINIC_STATUS_OPTIONS}
                        onChange={(v) => setField('clinic_status', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
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
                  <div className='space-y-1.5'>
                    <Label>
                      Полный адрес <span className='text-destructive'>*</span>
                    </Label>
                    <div className='flex flex-col gap-2 sm:flex-row'>
                      <Input
                        value={form.full_address}
                        onChange={(e) =>
                          setField('full_address', e.target.value)
                        }
                        placeholder='Введите адрес для поиска'
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
              <form onSubmit={handleSearch} className='flex items-center gap-2'>
                <div className='relative'>
                  <SearchIcon className='absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder='Поиск: ФИО, город или клиника'
                    className='w-64 ps-8'
                  />
                </div>
                <Button type='submit' variant='outline'>
                  Поиск
                </Button>
              </form>
            </div>
          </CardHeader>

          <CardContent>
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

// A plain "<Select/>" for the entry form — no "Все" item (this isn't a
// filter, an empty value here just means the field wasn't filled in).
function FormSelect({
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Не выбрано',
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  // The current value is always shown, whether or not it's in `options`:
  // "Найти адрес" can set values the cascade lists don't know, and clicking
  // a table row sets Город/Регион/Область before their lists return. So:
  //  1. The value is always one of the items (added up front unless that
  //     exact string is already there), so Radix can select it.
  //  2. SelectValue is given the label directly. Otherwise Radix only fills
  //     the trigger once the matching item has rendered, which left the
  //     field blank on the first row click when the list arrived late.
  // Blank and duplicate options are dropped — Radix rejects an empty item
  // value, and a repeated one would duplicate its React key.
  const trimmed = (value ?? '').trim()
  const cleanOptions = Array.from(
    new Set(options.filter((o) => (o ?? '').trim() !== ''))
  )
  const allOptions =
    trimmed !== '' && !cleanOptions.includes(value)
      ? [value, ...cleanOptions]
      : cleanOptions
  const selectValue = trimmed === '' ? EMPTY : value

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onChange(v === EMPTY ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger className='w-full'>
        <SelectValue placeholder={placeholder}>
          {selectValue === EMPTY ? '—' : value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY}>—</SelectItem>
        {allOptions.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
