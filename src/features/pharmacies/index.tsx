import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  PROMO_CODES,
  photoSubtypesFor,
  subtypesFor,
  type PromoSubtype,
} from './promo-catalog'
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

// Radix Select item values can't be an empty string — the entry form's own
// optional dropdowns below map "not set" to this sentinel.
const EMPTY = '__EMPTY__'

// Fixed option lists for the form's enum-like fields — no API backs these,
// the values are constant. FormSelect already offers its own blank "—"
// item, so none of these repeats "" itself.
const BRAND_OPTIONS = ['SOLGAR', 'NATURES BOUNTY', 'OBF']
const ASSORTIMENT_OPTIONS = ['под заказ', 'assortiment']
const ACTIVENESS_OPTIONS = ['Актив', 'Не Актив', 'Закрыта']

// Today as yyyy-MM-dd (local time) — Дата активации's default.
const todayISO = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

interface PharmaciesSearch {
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

  // Local input state so typing doesn't trigger a fetch on every keystroke —
  // only submitting the form (or pressing Enter) commits `search` to the URL.
  const [searchInput, setSearchInput] = useState(query)

  // resetScroll: false — this navigate() only ever updates brand/search/
  // page within the same route, and TanStack Router's default is to scroll
  // the window back to top on every navigation (including these), which
  // yanks the list back up whenever Вперёд/Назад is clicked mid-scroll.
  const setSearch = (next: PharmaciesSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), resetScroll: false })

  const { data, isLoading, isPlaceholderData, error } =
    useQuery<PharmacyApiResponse>({
      // No filter params — the backend itself narrows a medrep's list to
      // their own pharmacies.
      queryKey: ['pharmacies', brand, page, query],
      queryFn: async () => {
        const params = new URLSearchParams({ brand, page: String(page) })
        if (query) params.set('search', query)
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch({ page: 1, search: searchInput || undefined })
  }

  const changeBrand = (newBrand: string) => {
    setSearch({ brand: newBrand, page: 1 })
  }

  // ===== Карточка аптеки (Pharmacy Entry&Update) =====

  const [form, setForm] = useState<PharmacyFormValues>(DEFAULT_PHARMACY_FORM)
  const [editingId, setEditingId] = useState<string | number | null>(null)
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
        // Адрес аптеки is prefilled with the found address too — still
        // editable by hand afterwards.
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

  // Промо → Подтип cascade (see promo-catalog.ts) and its photo gallery,
  // which only some Промо (СТОЙКИ/КОРНЕР) have.
  const [promoGalleryOpen, setPromoGalleryOpen] = useState(false)
  const promoSubtypes = subtypesFor(form.promo)
  const promoPhotoSubtypes = photoSubtypesFor(form.promo)
  const selectedPromoSubtype: PromoSubtype | undefined = promoSubtypes.find(
    (s) => s.name === form.promo_subtype
  )

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
                      <Label>Страна</Label>
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
                      <Label>Область</Label>
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
                      <Label>Регион</Label>
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
                      <Label>Город</Label>
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
                      <Label>Группа компаний</Label>
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
                      <Label>Подгруппа</Label>
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
                      <Label>Мед. представитель</Label>
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
                      <Label>Категория</Label>
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
                      <Label>Активность</Label>
                      <FormSelect
                        value={form.pharmacy_activeness}
                        options={ACTIVENESS_OPTIONS}
                        onChange={(v) => setField('pharmacy_activeness', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Тип аптеки</Label>
                      <FormSelect
                        value={form.pharmacy_type}
                        options={formFilterOptions?.types ?? []}
                        onChange={(v) => setField('pharmacy_type', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Промо</Label>
                      <FormSelect
                        value={form.promo}
                        options={PROMO_CODES}
                        onChange={(v) =>
                          setForm((prev) => ({
                            ...prev,
                            promo: v,
                            promo_subtype: '',
                          }))
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Подтип</Label>
                      <div className='flex gap-2'>
                        <div className='min-w-0 flex-1'>
                          <FormSelect
                            value={form.promo_subtype}
                            options={promoSubtypes.map((s) => s.name)}
                            disabled={!form.promo}
                            placeholder={
                              form.promo
                                ? 'Не выбрано'
                                : 'Сначала выберите промо'
                            }
                            onChange={(v) => setField('promo_subtype', v)}
                          />
                        </div>
                        {promoPhotoSubtypes.length > 0 && (
                          <Button
                            type='button'
                            variant='outline'
                            onClick={() => setPromoGalleryOpen(true)}
                          >
                            <ImageIcon className='size-4' />
                            Выбрать фото
                          </Button>
                        )}
                      </div>
                      {selectedPromoSubtype && (
                        <p className='text-xs text-muted-foreground'>
                          Бренд: {selectedPromoSubtype.brand || '—'} · Габариты:{' '}
                          {selectedPromoSubtype.size || '—'}
                        </p>
                      )}
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Статус</Label>
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
                    <div className='space-y-1.5 lg:col-span-3'>
                      <Label>Адрес аптеки</Label>
                      <Input
                        value={form.pharmacy_address}
                        onChange={(e) =>
                          setField('pharmacy_address', e.target.value)
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
                    <Label>Полный адрес</Label>
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

        <Dialog open={promoGalleryOpen} onOpenChange={setPromoGalleryOpen}>
          <DialogContent className='sm:max-w-4xl'>
            <DialogHeader>
              <DialogTitle>Выбрать фото — {form.promo}</DialogTitle>
              <DialogDescription>
                Нажмите на фото, чтобы выбрать подтип
              </DialogDescription>
            </DialogHeader>
            {/* Scrolls on its own so a long gallery never overflows the
                dialog; photos use object-contain at a fixed height so
                nothing (shelf labels etc.) gets cropped. */}
            <div className='max-h-[70vh] overflow-y-auto pe-1'>
              <div className='grid grid-cols-2 gap-4 lg:grid-cols-3'>
                {promoPhotoSubtypes.map((s) => (
                  <button
                    key={s.name}
                    type='button'
                    onClick={() => {
                      setField('promo_subtype', s.name)
                      setPromoGalleryOpen(false)
                    }}
                    className={
                      'overflow-hidden rounded-md border text-start transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none' +
                      (form.promo_subtype === s.name
                        ? ' border-primary ring-2 ring-primary'
                        : '')
                    }
                  >
                    <img
                      src={s.photo}
                      alt={s.name}
                      className='h-56 w-full bg-muted object-contain p-2'
                    />
                    <p className='mt-2 px-2 pb-2 text-center text-sm font-medium'>
                      {s.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
              <form onSubmit={handleSearch} className='flex items-center gap-2'>
                <div className='relative'>
                  <SearchIcon className='absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder='Поиск: название, город или адрес...'
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
