import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { BrandSpinner } from '@/components/brand-spinner'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
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

// Radix Select item values can't be an empty string — "" (no filter) is
// represented by this sentinel in every dropdown below.
const ALL = '__ALL__'

// And for the entry form's own optional dropdowns below — "not set" is a
// legitimate value there too, just without a "Все" label attached to it.
const EMPTY = '__EMPTY__'

// Fixed option lists for the form's enum-like fields — no API backs these,
// the values are constant. FormSelect already offers its own blank "—"
// item, so none of these repeats "" itself.
const BRAND_OPTIONS = ['SOLGAR', 'NATURES BOUNTY', 'OBF']
const ASSORTIMENT_OPTIONS = ['под заказ', 'assortiment']
const ACTIVENESS_OPTIONS = ['Актив', 'Не Актив', 'Закрыта']

interface PharmaciesSearch {
  brand?: string
  page?: number
  search?: string
  country?: string
  area?: string
  region?: string
  city?: string
  group_company?: string
  pharmacy_category?: string
  pharmacy_type?: string
  promo?: string
  marketing_staff?: string
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
  activeness: '',
  pharmacy_type: '',
  promo: '',
  status: '',
  sku: '',
  cornerNo: '',
  pharmacy_activation_date: '',
  pharmacy_response_person: '',
  pharmacy_email: '',
  pharmacy_tel: '',
  pharmacist_name_1: '',
  pharmacy_home_tel: '',
  pharmacist_name_2: '',
  pharmacy_work_tel: '',
  pharmacy_no: '',
  comments: '',
  pharmacy_address: '',
  street: '',
  homenumber: '',
  point_x: '',
  point_y: '',
  full_address: '',
  country_code: '',
  building_type: '',
}

// point_x/point_y are edited as plain strings (they're just number
// <Input>s) but are numeric server-side — this converts a blank string to
// null and everything else to a Number right before a create/update
// request goes out, so the backend never has to coerce it.
function buildPharmacyPayload(form: PharmacyFormValues) {
  const toNumberOrNull = (v: string) => (v.trim() === '' ? null : Number(v))
  return {
    ...form,
    point_x: toNumberOrNull(form.point_x),
    point_y: toNumberOrNull(form.point_y),
  }
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
  // own country and can't change it (see useCountryLock). Shared by both
  // the filter panel below and the entry form's own Страна field.
  const countryLock = useCountryLock()
  const locked = countryLock.locked
  const effectiveCountry = locked
    ? countryLock.userCountry
    : (search.country ?? '')

  const [filtersOpen, setFiltersOpen] = useState(true)

  // Local input state so typing doesn't trigger a fetch on every keystroke —
  // only submitting the form (or pressing Enter) commits `search` to the URL.
  const [searchInput, setSearchInput] = useState(query)

  const setSearch = (next: PharmaciesSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) })

  // Every dropdown filter resets pagination back to page 1.
  const applyFilter = (patch: PharmaciesSearch) =>
    setSearch({ ...patch, page: 1 })

  const { data, isLoading, isPlaceholderData, error } =
    useQuery<PharmacyApiResponse>({
      queryKey: [
        'pharmacies',
        brand,
        page,
        query,
        effectiveCountry,
        search.area,
        search.region,
        search.city,
        search.group_company,
        search.pharmacy_category,
        search.pharmacy_type,
        search.promo,
        search.marketing_staff,
      ],
      queryFn: async () => {
        const params = new URLSearchParams({ brand, page: String(page) })
        if (query) params.set('search', query)
        if (effectiveCountry) params.set('country', effectiveCountry)
        if (search.area) params.set('area', search.area)
        if (search.region) params.set('region', search.region)
        if (search.city) params.set('city', search.city)
        if (search.group_company)
          params.set('group_company', search.group_company)
        if (search.pharmacy_category)
          params.set('pharmacy_category', search.pharmacy_category)
        if (search.pharmacy_type)
          params.set('pharmacy_type', search.pharmacy_type)
        if (search.promo) params.set('promo', search.promo)
        if (search.marketing_staff)
          params.set('marketing_staff', search.marketing_staff)
        const res = await api.get<PharmacyApiResponse>(
          `/sales/api/pharmacy/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  // Independent dropdown lists for the *filter panel* — re-fetched
  // whenever the list's own brand changes (SOLGAR/BOUNTY/OBF are backed by
  // different tables server-side). The entry form below has its own,
  // independent copy of this (formFilterOptions), keyed off the form's own
  // draft brand rather than the list's.
  const { data: filterOptions } = useQuery<PharmacyFilterOptions>({
    queryKey: ['pharmacy-filter-options', brand],
    queryFn: async () => {
      const res = await api.get<PharmacyFilterOptions>(
        `/sales/api/pharmacy/filter-options/?brand=${encodeURIComponent(brand)}`
      )
      return res.data
    },
  })

  // Cascading location levels for the *filter panel* — each only fetches
  // once its parent is set. The entry form below has its own, independent
  // copies of these three (formArea/formRegion/formCityOptions).
  const { data: areaOptions } = useQuery<PharmacyCascadeOptions>({
    queryKey: ['pharmacy-filter-area', brand, effectiveCountry],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand,
        level: 'area',
        country: effectiveCountry,
      })
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(effectiveCountry),
  })

  const { data: regionOptions } = useQuery<PharmacyCascadeOptions>({
    queryKey: ['pharmacy-filter-region', brand, effectiveCountry, search.area],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand,
        level: 'region',
        country: effectiveCountry,
        area: search.area!,
      })
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(effectiveCountry && search.area),
  })

  const { data: cityOptions } = useQuery<PharmacyCascadeOptions>({
    queryKey: [
      'pharmacy-filter-city',
      brand,
      effectiveCountry,
      search.area,
      search.region,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        brand,
        level: 'city',
        country: effectiveCountry,
        area: search.area!,
        region: search.region!,
      })
      const res = await api.get<PharmacyCascadeOptions>(
        `/sales/api/pharmacy/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(effectiveCountry && search.area && search.region),
  })

  const brands = data?.brands ?? [
    { value: DEFAULT_BRAND, label: DEFAULT_BRAND },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch({ page: 1, search: searchInput || undefined })
  }

  const changeBrand = (newBrand: string) => {
    // Different brands are different tables server-side, so every filter
    // (besides the free-text search) is reset along with the brand.
    setSearch({
      brand: newBrand,
      page: 1,
      country: undefined,
      area: undefined,
      region: undefined,
      city: undefined,
      group_company: undefined,
      pharmacy_category: undefined,
      pharmacy_type: undefined,
      promo: undefined,
      marketing_staff: undefined,
    })
  }

  const resetFilters = () =>
    setSearch({
      page: 1,
      country: undefined,
      area: undefined,
      region: undefined,
      city: undefined,
      group_company: undefined,
      pharmacy_category: undefined,
      pharmacy_type: undefined,
      promo: undefined,
      marketing_staff: undefined,
    })

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

  // The form's own dropdown lists — independent of the filter panel's,
  // keyed off the form's own draft Компания rather than the list's.
  const { data: formFilterOptions } = useQuery<PharmacyFilterOptions>({
    queryKey: ['pharmacy-form-filter-options', form.brand],
    queryFn: async () => {
      const res = await api.get<PharmacyFilterOptions>(
        `/sales/api/pharmacy/filter-options/?brand=${encodeURIComponent(form.brand)}`
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
        activeness: data.activeness ?? '',
        pharmacy_type: data.pharmacy_type ?? '',
        promo: data.promo ?? '',
        status: data.status ?? '',
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
        pharmacy_address: data.pharmacy_address ?? '',
        street: data.street ?? '',
        homenumber: data.homenumber ?? '',
        point_x: data.point_x != null ? String(data.point_x) : '',
        point_y: data.point_y != null ? String(data.point_y) : '',
        full_address: data.full_address ?? '',
        country_code: data.country_code ?? '',
        building_type: data.building_type ?? '',
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
        street: data.street ?? prev.street,
        homenumber: data.home_number ?? prev.homenumber,
        city: data.city ?? prev.city,
        area: data.administrative_area_name ?? prev.area,
        region: data.sub_administrative_area_name ?? prev.region,
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
        ...buildPharmacyPayload({ ...form, country: formCountry }),
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
    if (!form.pharmacy_no.trim()) {
      setFormError('Укажите номер аптеки')
      return
    }
    setFormError(null)
    setPendingRows((prev) => [...prev, { ...form, country: formCountry }])
    resetForm()
  }

  const handleSaveAll = () => {
    setFormNotice(null)
    setFormError(null)
    bulkSaveMutation.mutate()
  }

  const handleUpdate = () => {
    setFormNotice(null)
    if (!form.pharmacy_no.trim()) {
      setFormError('Укажите номер аптеки')
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
                      <FormSelect
                        value={formCountry}
                        options={
                          locked
                            ? [countryLock.userCountry]
                            : (formFilterOptions?.countries ?? [])
                        }
                        disabled={locked}
                        onChange={setFormCountry}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Область</Label>
                      <FormSelect
                        value={form.area}
                        options={formAreaOptions?.options ?? []}
                        disabled={!formCountry}
                        placeholder={
                          formCountry ? 'Не выбрано' : 'Сначала выберите страну'
                        }
                        onChange={setFormArea}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Регион</Label>
                      <FormSelect
                        value={form.region}
                        options={formRegionOptions?.options ?? []}
                        disabled={!form.area}
                        placeholder={
                          form.area ? 'Не выбрано' : 'Сначала выберите область'
                        }
                        onChange={setFormRegion}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Город</Label>
                      <FormSelect
                        value={form.city}
                        options={formCityOptions?.options ?? []}
                        disabled={!form.region}
                        placeholder={
                          form.region ? 'Не выбрано' : 'Сначала выберите регион'
                        }
                        onChange={(v) => setField('city', v)}
                      />
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
                      <Input
                        value={form.metro}
                        onChange={(e) => setField('metro', e.target.value)}
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
                        onChange={(v) => setField('group_company', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Подгруппа</Label>
                      <Input
                        value={form.subgroup_company}
                        onChange={(e) =>
                          setField('subgroup_company', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Мед. представитель</Label>
                      <FormSelect
                        value={form.marketing_staff}
                        options={formFilterOptions?.marketing_staff ?? []}
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
                        options={ASSORTIMENT_OPTIONS}
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
                        value={form.activeness}
                        options={ACTIVENESS_OPTIONS}
                        onChange={(v) => setField('activeness', v)}
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
                        options={formFilterOptions?.promos ?? []}
                        onChange={(v) => setField('promo', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Статус</Label>
                      <Input
                        value={form.status}
                        onChange={(e) => setField('status', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>SKU</Label>
                      <Input
                        value={form.sku}
                        onChange={(e) => setField('sku', e.target.value)}
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
                      <Input
                        type='date'
                        value={form.pharmacy_activation_date}
                        onChange={(e) =>
                          setField('pharmacy_activation_date', e.target.value)
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
                      <Label>
                        Номер Аптека <span className='text-destructive'>*</span>
                      </Label>
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
                      найденному адресу — эти поля недоступны для ручного
                      ввода и берутся только из результата геокодирования
                      (DaData).
                    </p>
                  </div>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <div className='space-y-1.5 lg:col-span-3'>
                      <Label>Официальный адрес</Label>
                      <Input
                        value={form.full_address}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
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
                        value={form.area}
                        disabled
                        readOnly
                        className='disabled:opacity-70'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Подрайон (Sub-administrative)</Label>
                      <Input
                        value={form.region}
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
                Добавлены локально — нажмите «Сохранить» в карточке выше,
                чтобы записать их в базу
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

        <Card className='mb-4'>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0'>
              <CardTitle className='text-base'>Фильтры</CardTitle>
              <div className='flex items-center gap-2'>
                <Button variant='ghost' size='sm' onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant='ghost' size='icon'>
                    <ChevronDown
                      className={cn(
                        'size-4 transition-transform',
                        filtersOpen && 'rotate-180'
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                  <FilterSelect
                    label='Страна'
                    value={effectiveCountry || undefined}
                    options={
                      locked
                        ? [countryLock.userCountry]
                        : (filterOptions?.countries ?? [])
                    }
                    disabled={locked}
                    onChange={(v) =>
                      applyFilter({
                        country: v,
                        area: undefined,
                        region: undefined,
                        city: undefined,
                      })
                    }
                  />
                  <FilterSelect
                    label='Область'
                    value={search.area}
                    options={areaOptions?.options ?? []}
                    disabled={!effectiveCountry}
                    placeholder={
                      effectiveCountry ? 'Все' : 'Сначала выберите страну'
                    }
                    onChange={(v) =>
                      applyFilter({
                        area: v,
                        region: undefined,
                        city: undefined,
                      })
                    }
                  />
                  <FilterSelect
                    label='Регион'
                    value={search.region}
                    options={regionOptions?.options ?? []}
                    disabled={!search.area}
                    placeholder={
                      search.area ? 'Все' : 'Сначала выберите область'
                    }
                    onChange={(v) =>
                      applyFilter({ region: v, city: undefined })
                    }
                  />
                  <FilterSelect
                    label='Город'
                    value={search.city}
                    options={cityOptions?.options ?? []}
                    disabled={!search.region}
                    placeholder={
                      search.region ? 'Все' : 'Сначала выберите регион'
                    }
                    onChange={(v) => applyFilter({ city: v })}
                  />
                  <FilterSelect
                    label='Сеть'
                    value={search.group_company}
                    options={filterOptions?.chains ?? []}
                    onChange={(v) => applyFilter({ group_company: v })}
                  />
                  <FilterSelect
                    label='Категория'
                    value={search.pharmacy_category}
                    options={filterOptions?.categories ?? []}
                    onChange={(v) => applyFilter({ pharmacy_category: v })}
                  />
                  <FilterSelect
                    label='Тип'
                    value={search.pharmacy_type}
                    options={filterOptions?.types ?? []}
                    onChange={(v) => applyFilter({ pharmacy_type: v })}
                  />
                  <FilterSelect
                    label='Промо'
                    value={search.promo}
                    options={filterOptions?.promos ?? []}
                    onChange={(v) => applyFilter({ promo: v })}
                  />
                  <FilterSelect
                    label='Мед. представитель'
                    value={search.marketing_staff}
                    options={filterOptions?.marketing_staff ?? []}
                    onChange={(v) => applyFilter({ marketing_staff: v })}
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

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
              <div
                className={
                  // 42 dynamic columns from the backend are far wider than
                  // any viewport — scroll-x-visible keeps a fat, always-on,
                  // mouse-draggable horizontal scrollbar (rather than the
                  // thin auto-hide default) so that's discoverable, and
                  // min-w-max on <Table> below lets it grow to its full
                  // content width instead of squeezing 42 columns into
                  // whatever width the container happens to have.
                  'scroll-x-visible max-h-[600px] overflow-y-auto rounded-md border transition-opacity' +
                  (isPlaceholderData ? ' opacity-60' : '')
                }
              >
                <Table className='min-w-max'>
                  <TableHeader className='sticky top-0 bg-card'>
                    <TableRow>
                      {data.columns.map((col) => (
                        <TableHead key={col} className='whitespace-nowrap'>
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row, idx) => {
                      const id = row[0] != null ? String(row[0]) : ''
                      const selected =
                        id !== '' &&
                        editingId != null &&
                        id === String(editingId)
                      return (
                        <TableRow
                          key={idx}
                          onClick={() => handleRowClick(id)}
                          className={cn(
                            id && 'cursor-pointer hover:bg-muted/50',
                            selected && 'bg-muted'
                          )}
                        >
                          {row.map((cell, cellIdx) => (
                            <TableCell
                              key={cellIdx}
                              className='whitespace-nowrap'
                            >
                              {cell ?? ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
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

// A single "<Label/><Select/>" filter field with a built-in "Все" (no
// filter) option — shared by every dropdown in the filter panel above.
function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Все',
}: {
  label: string
  value: string | undefined
  options: string[]
  onChange: (value: string | undefined) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <div className='space-y-1.5'>
      <Label>{label}</Label>
      <Select
        value={value ?? ALL}
        onValueChange={(v) => onChange(v === ALL ? undefined : v)}
        disabled={disabled}
      >
        <SelectTrigger className='w-full'>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Все</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
  // The current value can come from somewhere other than this list —
  // "Найти адрес" fills Область/Регион straight from DaData, and Компания
  // itself always defaults to a fixed value — rather than have the Select
  // silently show nothing for a value it doesn't recognize, make sure that
  // value is always one of the render options.
  const allOptions =
    value !== '' && !options.includes(value) ? [value, ...options] : options

  return (
    <Select
      value={value === '' ? EMPTY : value}
      onValueChange={(v) => onChange(v === EMPTY ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger className='w-full'>
        <SelectValue placeholder={placeholder} />
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
