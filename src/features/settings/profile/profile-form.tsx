import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandSpinner } from '@/components/brand-spinner'
import { type ProfileResponse, type ProfileUpdatePayload } from './types'

const EDITABLE_FIELDS = [
  { key: 'first_name', label: 'Имя' },
  { key: 'last_name', label: 'Фамилия' },
  { key: 'email', label: 'Эл. почта' },
  { key: 'phone', label: 'Телефон' },
  { key: 'department', label: 'Отдел' },
] as const

const EMPTY_FORM: ProfileUpdatePayload = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department: '',
}

export function ProfileForm() {
  const queryClient = useQueryClient()

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<ProfileResponse>('/sales/api/profile/')
      return res.data
    },
  })

  // Local, editable copy of the five updatable fields — resynced from the
  // server whenever fresh data arrives (initial load, and again after a
  // successful save, where the server is the source of truth either way).
  // Adjusted directly during render (React's documented alternative to an
  // effect for this) by tracking the last `profile` object seen.
  const [profileSnapshot, setProfileSnapshot] = useState<
    ProfileResponse | undefined
  >(undefined)
  const [form, setForm] = useState<ProfileUpdatePayload>(EMPTY_FORM)
  if (profile && profile !== profileSnapshot) {
    setProfileSnapshot(profile)
    setForm({
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      department: profile.department,
    })
  }

  const setField = (key: keyof ProfileUpdatePayload, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ProfileResponse>('/sales/api/profile/', form)
      return res.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16'>
        <BrandSpinner size={48} label='Загрузка данных' />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <Alert variant='destructive'>
        <AlertCircle />
        <AlertTitle>Ошибка загрузки профиля</AlertTitle>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* A native <fieldset disabled> cascades to every input/button inside
          it — the whole form is locked to view-only without touching each
          field individually (see the settings-wide banner in
          ContentSection for why: managed by an administrator). */}
      <fieldset disabled className='space-y-6'>
        {profile.is_azure && (
          <Alert>
            <ShieldAlert />
            <AlertTitle>Аккаунт Microsoft Entra ID</AlertTitle>
            <AlertDescription>
              Ваш аккаунт управляется через Microsoft Entra ID. Некоторые поля
              могут быть перезаписаны при следующем входе.
            </AlertDescription>
          </Alert>
        )}

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {EDITABLE_FIELDS.map(({ key, label }) => (
            <div key={key} className='space-y-1.5'>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className='space-y-2'>
          <div className='text-sm font-medium text-muted-foreground'>
            Только для чтения
          </div>
          <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
            <div className='space-y-1'>
              <Label className='text-xs text-muted-foreground'>
                Имя пользователя
              </Label>
              <div>
                <Badge variant='secondary'>{profile.username}</Badge>
              </div>
            </div>
            <div className='space-y-1'>
              <Label className='text-xs text-muted-foreground'>
                Уровень доступа
              </Label>
              <div>
                <Badge variant='secondary'>{profile.access_level}</Badge>
              </div>
            </div>
            <div className='space-y-1'>
              <Label className='text-xs text-muted-foreground'>
                Тип аккаунта
              </Label>
              <div>
                <Badge variant='secondary'>{profile.user_type}</Badge>
              </div>
            </div>
          </div>
        </div>

        {saveMutation.isError && (
          <Alert variant='destructive'>
            <AlertCircle />
            <AlertTitle>Не удалось сохранить профиль</AlertTitle>
          </Alert>
        )}

        {saveMutation.isSuccess && (
          <Alert className='border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'>
            <CheckCircle2 />
            <AlertTitle>Профиль обновлён</AlertTitle>
          </Alert>
        )}

        <Button type='submit' disabled={saveMutation.isPending}>
          {saveMutation.isPending && <BrandSpinner size={16} />}
          Сохранить
        </Button>
      </fieldset>
    </form>
  )
}
