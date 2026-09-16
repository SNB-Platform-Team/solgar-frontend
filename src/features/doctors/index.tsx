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
  type DoctorApiResponse,
  type DoctorCascadeOptions,
  type DoctorCreateResponse,
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

// Same sentinel idea for every "Все" (no filter) dropdown in the filter panel.
const ALL = '__ALL__'

// And for the entry form's own optional dropdowns below — "not set" is a
// legitimate value there too, just without a "Все" label attached to it.
const EMPTY = '__EMPTY__'

// Fixed option lists for the three enum-like form fields below — no API
// backs these, the values are constant. FormSelect already offers its own
// blank "—" item, so none of these lists repeats "" itself.
const CATEGORY_OPTIONS = ['A+', 'A', 'B', 'C']
const ACTIVENESS_OPTIONS = ['Актив', 'Не Актив', 'в процессе']
const CLINIC_STATUS_OPTIONS = ['GOLD', 'PLATINUM', 'SILVER']

interface DoctorsSearch {
  brand?: string
  page?: number
  search?: string
  country?: string
  area?: string
  region?: string
  city?: string
  specialty?: string
  unified_specialty?: string
  medrep?: string
}

const DEFAULT_DOCTOR_FORM: DoctorFormValues = {
  doctor_name: '',
  medrep: '',
  category: '',
  unified_specialty: '',
  specialty: '',
  position_regalia: '',
  doctor_date: '',
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
}

// clinic_count/point_x/point_y are edited as plain strings (they're just
// text/number <Input>s) but are numeric server-side — this converts a blank
// string to null and everything else to a Number right before a
// create/update request goes out, so the backend never has to coerce it.
function buildDoctorPayload(form: DoctorFormValues) {
  const toNumberOrNull = (v: string) => (v.trim() === '' ? null : Number(v))
  return {
    ...form,
    clinic_count: toNumberOrNull(form.clinic_count),
    point_x: toNumberOrNull(form.point_x),
    point_y: toNumberOrNull(form.point_y),
  }
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

  const setSearch = (next: DoctorsSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) })

  // Every dropdown filter resets pagination back to page 1.
  const applyFilter = (patch: DoctorsSearch) => setSearch({ ...patch, page: 1 })

  const { data, isLoading, isPlaceholderData, error } =
    useQuery<DoctorApiResponse>({
      queryKey: [
        'doctors',
        brand,
        page,
        query,
        effectiveCountry,
        search.area,
        search.region,
        search.city,
        search.specialty,
        search.unified_specialty,
        search.medrep,
      ],
      queryFn: async () => {
        const params = new URLSearchParams({ brand, page: String(page) })
        if (query) params.set('search', query)
        if (effectiveCountry) params.set('country', effectiveCountry)
        if (search.area) params.set('area', search.area)
        if (search.region) params.set('region', search.region)
        if (search.city) params.set('city', search.city)
        if (search.specialty) params.set('specialty', search.specialty)
        if (search.unified_specialty)
          params.set('unified_specialty', search.unified_specialty)
        if (search.medrep) params.set('medrep', search.medrep)
        const res = await api.get<DoctorApiResponse>(
          `/sales/api/doctor/?${params}`
        )
        return res.data
      },
      placeholderData: (previousData) => previousData,
    })

  // Independent dropdown lists — not brand-scoped (unlike pharmacies). Also
  // feeds the entry form's Мед. представитель/Специальность/Осн.
  // специальность dropdowns below.
  const { data: filterOptions } = useQuery<DoctorFilterOptions>({
    queryKey: ['doctor-filter-options'],
    queryFn: async () => {
      const res = await api.get<DoctorFilterOptions>(
        '/sales/api/doctor/filter-options/'
      )
      return res.data
    },
  })

  // Cascading location levels for the *filter panel* — each only fetches
  // once its parent is set. The entry form below has its own, independent
  // copies of these three (formArea/formRegion/formCityOptions), keyed off
  // the form's own draft country/area/region rather than the URL.
  const { data: areaOptions } = useQuery<DoctorCascadeOptions>({
    queryKey: ['doctor-filter-area', effectiveCountry],
    queryFn: async () => {
      const params = new URLSearchParams({
        level: 'area',
        country: effectiveCountry,
      })
      const res = await api.get<DoctorCascadeOptions>(
        `/sales/api/doctor/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(effectiveCountry),
  })

  const { data: regionOptions } = useQuery<DoctorCascadeOptions>({
    queryKey: ['doctor-filter-region', effectiveCountry, search.area],
    queryFn: async () => {
      const params = new URLSearchParams({
        level: 'region',
        country: effectiveCountry,
        area: search.area!,
      })
      const res = await api.get<DoctorCascadeOptions>(
        `/sales/api/doctor/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(effectiveCountry && search.area),
  })

  const { data: cityOptions } = useQuery<DoctorCascadeOptions>({
    queryKey: [
      'doctor-filter-city',
      effectiveCountry,
      search.area,
      search.region,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        level: 'city',
        country: effectiveCountry,
        area: search.area!,
        region: search.region!,
      })
      const res = await api.get<DoctorCascadeOptions>(
        `/sales/api/doctor/filter-options/?${params}`
      )
      return res.data
    },
    enabled: Boolean(effectiveCountry && search.area && search.region),
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

  const resetFilters = () =>
    setSearch({
      page: 1,
      country: undefined,
      area: undefined,
      region: undefined,
      city: undefined,
      specialty: undefined,
      unified_specialty: undefined,
      medrep: undefined,
    })

  // ===== Карточка врача (Doctor Entry&Update) =====

  const [form, setForm] = useState<DoctorFormValues>(DEFAULT_DOCTOR_FORM)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formNotice, setFormNotice] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const setField = <K extends keyof DoctorFormValues>(
    key: K,
    value: DoctorFormValues[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const resetForm = () => {
    setForm(DEFAULT_DOCTOR_FORM)
    setEditingId(null)
    setFormError(null)
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

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = buildDoctorPayload({ ...form, country: formCountry })
      const res = await api.post<DoctorCreateResponse>(
        '/sales/api/doctor/create/',
        payload
      )
      return res.data
    },
    onSuccess: (data) => {
      if (data.error) {
        setFormError(data.error)
        return
      }
      setFormNotice('Врач добавлен')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        id: editingId,
        ...buildDoctorPayload({ ...form, country: formCountry }),
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setFormNotice(null)
    if (!form.doctor_name.trim()) {
      setFormError('Укажите имя доктора')
      return
    }
    setFormError(null)
    createMutation.mutate()
  }

  const handleUpdate = () => {
    setFormNotice(null)
    if (!form.doctor_name.trim()) {
      setFormError('Укажите имя доктора')
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
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending

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
            <form onSubmit={handleCreate} className='space-y-6'>
              <fieldset disabled={formBusy} className='space-y-6'>
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
                      <Label>Мед. представитель</Label>
                      <FormSelect
                        value={form.medrep}
                        options={filterOptions?.medreps ?? []}
                        onChange={(v) => setField('medrep', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Категория врачей</Label>
                      <FormSelect
                        value={form.category}
                        options={CATEGORY_OPTIONS}
                        onChange={(v) => setField('category', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Основная специальность</Label>
                      <FormSelect
                        value={form.unified_specialty}
                        options={filterOptions?.unified_specialties ?? []}
                        onChange={(v) => setField('unified_specialty', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Специальность</Label>
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
                      <Label>Дата активации</Label>
                      <Input
                        type='date'
                        value={form.doctor_date}
                        onChange={(e) =>
                          setField('doctor_date', e.target.value)
                        }
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
                      <Label>Доктор тел</Label>
                      <Input
                        type='tel'
                        value={form.doctor_tel}
                        onChange={(e) => setField('doctor_tel', e.target.value)}
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
                    <div className='space-y-1.5'>
                      <Label>Категория</Label>
                      <FormSelect
                        value={form.clinic_status}
                        options={CLINIC_STATUS_OPTIONS}
                        onChange={(v) => setField('clinic_status', v)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Название</Label>
                      <Input
                        value={form.clinic_name}
                        onChange={(e) =>
                          setField('clinic_name', e.target.value)
                        }
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
                    <div className='space-y-1.5 lg:col-span-2'>
                      <Label>Адрес клиники</Label>
                      <Input
                        value={form.clinic_address}
                        onChange={(e) =>
                          setField('clinic_address', e.target.value)
                        }
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
                      Заполняет point_x/point_y, Улицу, Дом, Город,
                      Область/Регион, код страны и тип здания ниже — по
                      найденному адресу; сами поля остаются редактируемыми
                      вручную.
                    </p>
                  </div>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    <div className='space-y-1.5'>
                      <Label>Страна</Label>
                      <FormSelect
                        value={formCountry}
                        options={
                          locked
                            ? [countryLock.userCountry]
                            : (filterOptions?.countries ?? [])
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
                      <Label>Улица</Label>
                      <Input
                        value={form.street}
                        onChange={(e) => setField('street', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Домашний номер</Label>
                      <Input
                        value={form.homenumber}
                        onChange={(e) => setField('homenumber', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>point_x</Label>
                      <Input
                        type='number'
                        step='any'
                        value={form.point_x}
                        onChange={(e) => setField('point_x', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>point_y</Label>
                      <Input
                        type='number'
                        step='any'
                        value={form.point_y}
                        onChange={(e) => setField('point_y', e.target.value)}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Код страны</Label>
                      <Input
                        value={form.country_code}
                        onChange={(e) =>
                          setField('country_code', e.target.value)
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Тип здания</Label>
                      <Input
                        value={form.building_type}
                        onChange={(e) =>
                          setField('building_type', e.target.value)
                        }
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
                  onClick={resetForm}
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
                  {createMutation.isPending && <BrandSpinner size={16} />}
                  Добавить
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
                    label='Специальность'
                    value={search.specialty}
                    options={filterOptions?.specialties ?? []}
                    onChange={(v) => applyFilter({ specialty: v })}
                  />
                  <FilterSelect
                    label='Ед. специальность'
                    value={search.unified_specialty}
                    options={filterOptions?.unified_specialties ?? []}
                    onChange={(v) => applyFilter({ unified_specialty: v })}
                  />
                  <FilterSelect
                    label='Мед. представитель'
                    value={search.medrep}
                    options={filterOptions?.medreps ?? []}
                    onChange={(v) => applyFilter({ medrep: v })}
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
              <div
                className={
                  // 34 dynamic columns from the backend are far wider than
                  // any viewport — scroll-x-visible keeps a fat, always-on,
                  // mouse-draggable horizontal scrollbar (rather than the
                  // thin auto-hide default) so that's discoverable, and
                  // min-w-max on <Table> below lets it grow to its full
                  // content width instead of squeezing 34 columns into
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
  // "Найти адрес" fills Область/Регион/Город straight from DaData, which
  // won't always match the filter-options cascade's known values. Rather
  // than have the Select silently show nothing for a value it doesn't
  // recognize, make sure that value is always one of the render options.
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
