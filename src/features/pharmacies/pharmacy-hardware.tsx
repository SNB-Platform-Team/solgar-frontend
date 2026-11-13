import { useEffect, useRef, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { posImageUrl } from './pos-images'
import { PROMO_CODES, subtypesFor } from './promo-catalog'
import { PromoFields } from './promo-fields'
import {
  type PharmacyCornerLogResponse,
  type PharmacyEquipmentDeleteResponse,
  type PharmacyEquipmentMeta,
  type PharmacyEquipmentSaveResponse,
  type PharmacyHardwarePhoto,
  type PharmacyHardwareRow,
} from './types'

const GREEN_BADGE =
  'border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-300'
const GREY_BADGE = 'border-border bg-muted text-muted-foreground'
const YELLOW_BADGE =
  'border-yellow-500/30 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300'

// corner_info's approve_status codes rather than the Russian labels, so a
// label rewording can't silently lose its color.
const HARDWARE_STATUS_BADGE: Record<string, string> = {
  '0': YELLOW_BADGE, // Новый
  '1': GREEN_BADGE, // Одобрено (менеджер)
  '2': GREEN_BADGE, // Одобрено (сеть)
  '3': GREEN_BADGE, // Макет одобрен
  '4': GREEN_BADGE, // Установлено
  '5': GREEN_BADGE, // Завершено
}

/** A row's identity in the table. Its source is part of it: the two tables
 * number their ids independently. Not Промо + Подтип: the same equipment can
 * be added more than once, and corner_info has no Промо name at all. */
const rowKey = (row: PharmacyHardwareRow, idx: number) =>
  row.id != null ? `${row.source}-${row.id}` : `${row.source}-idx-${idx}`

// Thumbnails shown per table row before collapsing the rest into "+N".
const MAX_ROW_THUMBNAILS = 3

/** The catalog's size for a Подтип, when it's a real one — many entries are
 * "—" or "Индивидуальный размер", which aren't worth prefilling. */
const catalogSize = (promo: string, subtype: string) => {
  const size = subtypesFor(promo).find((s) => s.name === subtype)?.size ?? ''
  return /\d/.test(size) ? size : ''
}

/** The backend's own message when it sent one — in the body of a 200 or of
 * an error response — else a generic one. */
function backendError(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.error
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

/** A photo picked for the next row: the File is what gets uploaded, the
 * object URL only drives its preview. */
interface PendingPhoto {
  file: File
  url: string
}

/**
 * Оборудование panel for the pharmacy picked in the list below it: the
 * record's equipment — read-only legacy rows from corner_info plus rows from
 * the equipment table — and Промо + Подтип + Размер + photos + Добавить,
 * which saves a new row straight away. Only "new" rows can be deleted.
 * Render with a `key` per pharmacy so the form resets when another one is
 * opened.
 *
 * The add section (Промо/Подтип/Размер/photos/Добавить) only shows with
 * `canAdd` — without it the panel just lists rows.
 *
 * Its Промо/Подтип are its own state on purpose: the card's fields of the
 * same name are saved by Обновить (into promo/comments), and adding a row
 * here must never change the record itself.
 */
export function PharmacyHardware({
  brand,
  pharmacyId,
  title,
  canAdd = false,
}: {
  brand: string
  pharmacyId: string | number
  /** Which pharmacy this is, for the heading. */
  title: string
  /** Show the add-equipment section. */
  canAdd?: boolean
}) {
  const queryClient = useQueryClient()
  const [selectedPromo, setSelectedPromo] = useState('')
  const [selectedSubtype, setSelectedSubtype] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedImidzh, setSelectedImidzh] = useState('')
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  // Every object URL still alive — each one pins its file in memory until
  // revoked, so they're released on removal, after saving and when the
  // panel unmounts.
  const objectUrls = useRef(new Set<string>())
  useEffect(() => {
    const urls = objectUrls.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])
  const releasePhotos = (photos: PendingPhoto[]) => {
    photos.forEach(({ url }) => {
      if (objectUrls.current.delete(url)) URL.revokeObjectURL(url)
    })
  }

  const queryKey = ['pharmacy-corner-log', brand, pharmacyId]
  const { data, isLoading, error } = useQuery<PharmacyCornerLogResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ brand, id: String(pharmacyId) })
      const res = await api.get<PharmacyCornerLogResponse>(
        `/sales/api/pharmacy/corner-log/?${params}`
      )
      return res.data
    },
  })

  const rows = data?.rows ?? []

  // Промо list + which Промо need a POS имидж + the имидж names for the
  // user's brand. Until it answers (or if it fails) the catalog's Промо are
  // offered and no имидж is asked for — the backend still enforces it.
  const { data: meta } = useQuery<PharmacyEquipmentMeta>({
    queryKey: ['pharmacy-equipment-meta'],
    queryFn: async () => {
      const res = await api.get<PharmacyEquipmentMeta>(
        '/sales/api/pharmacy/equipment/meta/'
      )
      return res.data
    },
    enabled: canAdd,
    staleTime: Infinity,
  })
  const promoOptions = meta?.promos.map((p) => p.name) ?? PROMO_CODES
  const requiresImidzh = Boolean(
    meta?.promos.find((p) => p.name === selectedPromo)?.requires_imidzh
  )

  // Saved and deleted rows are written into the cached list rather than
  // refetched, so the table changes the moment the request succeeds.
  const updateRows = (
    change: (rows: PharmacyHardwareRow[]) => PharmacyHardwareRow[]
  ) =>
    queryClient.setQueryData<PharmacyCornerLogResponse>(queryKey, (prev) =>
      prev ? { ...prev, rows: change(prev.rows) } : prev
    )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData()
      body.append('brand', brand)
      body.append('id', String(pharmacyId))
      body.append('promo', selectedPromo)
      body.append('subtype', selectedSubtype)
      body.append('size', selectedSize.trim())
      if (requiresImidzh) body.append('imidzh', selectedImidzh)
      pendingPhotos.forEach(({ file }) => body.append('photos', file))
      const res = await api.post<PharmacyEquipmentSaveResponse>(
        '/sales/api/pharmacy/equipment/save/',
        body
      )
      return res.data
    },
    onSuccess: (res) => {
      const saved = res.row
      if (res.error || !saved) {
        setNotice(res.error || 'Не удалось сохранить оборудование')
        return
      }
      updateRows((prev) => [...prev, saved])
      // Ready for the next item.
      releasePhotos(pendingPhotos)
      setPendingPhotos([])
      setSelectedPromo('')
      setSelectedSubtype('')
      setSelectedSize('')
      setSelectedImidzh('')
    },
    onError: (err) =>
      setNotice(backendError(err, 'Не удалось сохранить оборудование')),
  })

  const deleteMutation = useMutation({
    mutationFn: async (equipmentId: number) => {
      const res = await api.post<PharmacyEquipmentDeleteResponse>(
        '/sales/api/pharmacy/equipment/delete/',
        { equipment_id: equipmentId }
      )
      return res.data
    },
    onSuccess: (res, equipmentId) => {
      if (res.error || !res.ok) {
        setNotice(res.error || 'Не удалось удалить оборудование')
        return
      }
      updateRows((prev) =>
        prev.filter((r) => !(r.source === 'new' && r.id === equipmentId))
      )
    },
    onError: (err) =>
      setNotice(backendError(err, 'Не удалось удалить оборудование')),
  })

  const handleAdd = () => {
    setNotice(null)
    saveMutation.mutate()
  }

  const handleDelete = (equipmentId: number) => {
    setNotice(null)
    deleteMutation.mutate(equipmentId)
  }

  const handleSubtypeChange = (subtype: string) => {
    setSelectedSubtype(subtype)
    setSelectedSize(catalogSize(selectedPromo, subtype))
  }

  const handlePhotosPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({ file, url: URL.createObjectURL(file) }))
    picked.forEach(({ url }) => objectUrls.current.add(url))
    setPendingPhotos((prev) => [...prev, ...picked])
    // Cleared so picking the same file again still fires onChange.
    e.target.value = ''
  }

  const handleRemovePendingPhoto = (photo: PendingPhoto) => {
    setPendingPhotos((prev) => prev.filter((p) => p !== photo))
    releasePhotos([photo])
  }

  const saving = saveMutation.isPending

  return (
    <Card className='mb-4'>
      <CardHeader>
        <CardTitle className='text-base'>Оборудование — {title}</CardTitle>
        <CardDescription className='text-xs'>
          Существующее оборудование — из базы.
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-4'>
        {error || data?.error ? (
          <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
            {data?.error || 'Не удалось загрузить данные оборудования'}
          </div>
        ) : isLoading ? (
          <Skeleton className='h-24 w-full' />
        ) : rows.length > 0 ? (
          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader className='bg-muted/40'>
                <TableRow>
                  <TableHead className='h-8 font-semibold'>Промо</TableHead>
                  <TableHead className='h-8 font-semibold'>Подтип</TableHead>
                  <TableHead className='h-8 font-semibold'>Размер</TableHead>
                  <TableHead className='h-8 font-semibold'>Имидж</TableHead>
                  <TableHead className='h-8 font-semibold'>Статус</TableHead>
                  <TableHead className='h-8 font-semibold'>
                    Статус оборудования
                  </TableHead>
                  <TableHead className='h-8 font-semibold'>Фото</TableHead>
                  <TableHead className='h-8 w-10' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const equipmentId =
                    row.source === 'new' && row.id != null ? row.id : null
                  const deleting =
                    deleteMutation.isPending &&
                    deleteMutation.variables === equipmentId
                  return (
                    <TableRow key={rowKey(row, idx)}>
                      <TableCell className='py-1.5'>
                        {row.promo || '—'}
                      </TableCell>
                      <TableCell className='py-1.5'>
                        {row.subtype || '—'}
                      </TableCell>
                      <TableCell className='py-1.5'>
                        {row.size || '—'}
                      </TableCell>
                      <TableCell className='py-1.5'>
                        {row.imidzh || '—'}
                      </TableCell>
                      <TableCell className='py-1.5'>
                        <Badge
                          variant='outline'
                          className={
                            row.status === 1 ? GREEN_BADGE : GREY_BADGE
                          }
                        >
                          {row.status_label}
                        </Badge>
                      </TableCell>
                      <TableCell className='py-1.5'>
                        <Badge
                          variant='outline'
                          className={
                            HARDWARE_STATUS_BADGE[row.hardware_status] ??
                            GREY_BADGE
                          }
                        >
                          {row.hardware_status_label}
                        </Badge>
                      </TableCell>
                      <TableCell className='py-1.5'>
                        <RowPhotos photos={row.photos ?? []} />
                      </TableCell>
                      <TableCell className='py-1'>
                        {equipmentId !== null && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='size-7 text-muted-foreground hover:text-destructive'
                            aria-label={`Удалить: ${row.promo} — ${row.subtype}`}
                            disabled={deleting}
                            onClick={() => handleDelete(equipmentId)}
                          >
                            {deleting ? (
                              <Loader2 className='size-4 animate-spin' />
                            ) : (
                              <Trash2 className='size-4' />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground italic'>
            Оборудование не добавлено
          </p>
        )}

        {canAdd && (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <PromoFields
              promo={selectedPromo}
              subtype={selectedSubtype}
              promoOptions={promoOptions}
              onPromoChange={(v) => {
                setSelectedPromo(v)
                setSelectedSubtype('')
                setSelectedSize('')
                setSelectedImidzh('')
              }}
              onSubtypeChange={handleSubtypeChange}
            />
            <div className='space-y-1.5'>
              <Label htmlFor='hardware-size'>Размер</Label>
              <Input
                id='hardware-size'
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                disabled={!selectedSubtype}
                placeholder='180*30*20'
              />
            </div>
            {requiresImidzh && (
              <ImidzhPicker
                brand={meta?.brand ?? ''}
                names={meta?.imidzh ?? []}
                value={selectedImidzh}
                onChange={setSelectedImidzh}
                disabled={saving}
              />
            )}
            <div className='space-y-1.5 sm:col-span-2'>
              <Label htmlFor='hardware-photos'>Фото с места установки</Label>
              <Input
                id='hardware-photos'
                type='file'
                accept='image/*'
                multiple
                disabled={saving}
                onChange={handlePhotosPicked}
              />
              {pendingPhotos.length > 0 && (
                <div className='flex flex-wrap gap-2 pt-1'>
                  {pendingPhotos.map((photo, idx) => (
                    <div key={photo.url} className='relative'>
                      <img
                        src={photo.url}
                        alt={`Фото ${idx + 1}`}
                        className='size-16 rounded-md border object-cover'
                      />
                      <button
                        type='button'
                        aria-label={`Убрать фото ${idx + 1}`}
                        disabled={saving}
                        onClick={() => handleRemovePendingPhoto(photo)}
                        className='absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-50'
                      >
                        <X className='size-3' />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className='sm:pt-5'>
              <Button
                type='button'
                variant='outline'
                onClick={handleAdd}
                disabled={
                  !selectedPromo ||
                  !selectedSubtype ||
                  (requiresImidzh && !selectedImidzh) ||
                  saving
                }
              >
                {saving ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <Plus className='size-4' />
                )}
                Добавить
              </Button>
            </div>
          </div>
        )}

        {notice && <p className='text-sm text-destructive'>{notice}</p>}
      </CardContent>
    </Card>
  )
}

// «Имидж» for a must-have Промо: one POS image per card (image + name),
// single select. A name with no file — or whose file fails to load — is a
// text-only chip instead.
function ImidzhPicker({
  brand,
  names,
  value,
  onChange,
  disabled,
}: {
  brand: string
  names: string[]
  value: string
  onChange: (name: string) => void
  disabled?: boolean
}) {
  const [broken, setBroken] = useState<Set<string>>(() => new Set())
  return (
    <div className='space-y-1.5 sm:col-span-2 lg:col-span-3'>
      <Label>
        Имидж <span className='text-destructive'>*</span>
      </Label>
      {names.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          Нет имиджей для вашего бренда
        </p>
      ) : (
        <div className='flex flex-wrap gap-2' role='radiogroup'>
          {names.map((name) => {
            const url = broken.has(name) ? null : posImageUrl(brand, name)
            const selected = value === name
            return (
              <button
                key={name}
                type='button'
                role='radio'
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onChange(name)}
                className={cn(
                  'rounded-md border text-start text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
                  url ? 'w-32 overflow-hidden' : 'px-3 py-2',
                  selected && 'border-primary ring-2 ring-primary'
                )}
              >
                {url && (
                  <img
                    src={url}
                    alt=''
                    loading='lazy'
                    className='aspect-[3/4] w-full bg-muted object-cover'
                    onError={() => setBroken((prev) => new Set(prev).add(name))}
                  />
                )}
                <span className={cn('block', url && 'p-1.5')}>{name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Small previews of a row's photos, each opening full-size in a new tab.
function RowPhotos({ photos }: { photos: PharmacyHardwarePhoto[] }) {
  if (photos.length === 0) return <>—</>
  const hidden = photos.length - MAX_ROW_THUMBNAILS
  return (
    <div className='flex items-center gap-1'>
      {photos.slice(0, MAX_ROW_THUMBNAILS).map((photo, idx) => (
        <a
          key={photo.id}
          href={photo.url}
          target='_blank'
          rel='noopener noreferrer'
          title={photo.name}
        >
          <img
            src={photo.url}
            alt={photo.name || `Фото ${idx + 1}`}
            className='size-8 rounded border object-cover'
          />
        </a>
      ))}
      {hidden > 0 && (
        <span className='text-xs text-muted-foreground'>+{hidden}</span>
      )}
    </div>
  )
}
