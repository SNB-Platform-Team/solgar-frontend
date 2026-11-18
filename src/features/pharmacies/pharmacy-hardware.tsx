import { useEffect, useRef, useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  PROMO_CODES,
  apiSubtypePromo,
  isPhotoOnlyPromo,
  photoForSubtype,
  subtypesFor,
  type PromoSubtype,
} from './promo-catalog'
import { PromoFields } from './promo-fields'
import {
  type PharmacyCornerLogResponse,
  type PharmacyEquipmentDeleteResponse,
  type PharmacyEquipmentMeta,
  type PharmacyEquipmentSubtypes,
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

/** A photo picked for the next save: the File is what gets uploaded, the
 * object URL only drives its preview. */
interface PendingPhoto {
  file: File
  url: string
}

/** What the add / edit form hands back on submit. `imidzh` is '' unless the
 * Промо needs one; `deletePhotoIds` is only ever non-empty when editing. */
interface EquipmentDraft {
  promo: string
  subtype: string
  size: string
  imidzh: string
  newPhotos: File[]
  deletePhotoIds: number[]
}

/**
 * Оборудование panel for the pharmacy picked in the list below it: the
 * record's equipment — read-only legacy rows from corner_info plus rows from
 * the equipment table — and Промо + Подтип + Размер + photos + Добавить,
 * which saves a new row straight away. Only "new" rows can be deleted or
 * edited (Редактировать opens the same form, filled with the row, in a
 * dialog). Render with a `key` per pharmacy so the form resets when another
 * one is opened.
 *
 * The add section and Редактировать only show with `canAdd` — without it the
 * panel just lists rows (and Удалить).
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
  /** Show the add-equipment section and Редактировать. */
  canAdd?: boolean
}) {
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<string | null>(null)
  // Bumped after a save: remounts the add form, so it starts empty again.
  const [addFormKey, setAddFormKey] = useState(0)
  const [editingRow, setEditingRow] = useState<PharmacyHardwareRow | null>(null)
  const [editNotice, setEditNotice] = useState<string | null>(null)

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

  // Saved, edited and deleted rows are written into the cached list rather
  // than refetched, so the table changes the moment the request succeeds.
  const updateRows = (
    change: (rows: PharmacyHardwareRow[]) => PharmacyHardwareRow[]
  ) =>
    queryClient.setQueryData<PharmacyCornerLogResponse>(queryKey, (prev) =>
      prev ? { ...prev, rows: change(prev.rows) } : prev
    )

  const saveMutation = useMutation({
    mutationFn: async (draft: EquipmentDraft) => {
      const body = new FormData()
      body.append('brand', brand)
      body.append('id', String(pharmacyId))
      body.append('promo', draft.promo)
      body.append('subtype', draft.subtype)
      body.append('size', draft.size)
      if (draft.imidzh) body.append('imidzh', draft.imidzh)
      draft.newPhotos.forEach((file) => body.append('photos', file))
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
      setAddFormKey((k) => k + 1) // ready for the next item
    },
    onError: (err) =>
      setNotice(backendError(err, 'Не удалось сохранить оборудование')),
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      equipmentId,
      draft,
    }: {
      equipmentId: number
      draft: EquipmentDraft
    }) => {
      const body = new FormData()
      body.append('equipment_id', String(equipmentId))
      body.append('promo', draft.promo)
      body.append('subtype', draft.subtype)
      body.append('size', draft.size)
      body.append('imidzh', draft.imidzh)
      draft.deletePhotoIds.forEach((id) =>
        body.append('delete_photo_ids', String(id))
      )
      draft.newPhotos.forEach((file) => body.append('photos', file))
      const res = await api.post<PharmacyEquipmentSaveResponse>(
        '/sales/api/pharmacy/equipment/update/',
        body
      )
      return res.data
    },
    onSuccess: (res, { equipmentId }) => {
      const updated = res.row
      if (res.error || !updated) {
        setEditNotice(res.error || 'Не удалось сохранить изменения')
        return
      }
      updateRows((prev) =>
        prev.map((r) =>
          r.source === 'new' && r.id === equipmentId ? updated : r
        )
      )
      setEditingRow(null)
    },
    onError: (err) =>
      setEditNotice(backendError(err, 'Не удалось сохранить изменения')),
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

  const handleDelete = (equipmentId: number) => {
    setNotice(null)
    deleteMutation.mutate(equipmentId)
  }

  const openEdit = (row: PharmacyHardwareRow) => {
    setEditNotice(null)
    setEditingRow(row)
  }

  const updating = updateMutation.isPending
  const editingId = editingRow?.id

  return (
    <Card className='mb-4'>
      <CardHeader>
        <CardTitle className='text-base'>Оборудование — {title}</CardTitle>
        <CardDescription className='text-xs'>
          Существующее оборудование — из базы.
        </CardDescription>
        {/* Once per pharmacy (from corner-log), not per row. */}
        {data && !data.error && (
          <div className='flex flex-wrap gap-x-6 gap-y-1 pt-1 text-sm'>
            <span>
              <span className='text-muted-foreground'>ID аптеки:</span>{' '}
              <span className='font-medium tabular-nums'>
                {data.pharmacy_id != null && String(data.pharmacy_id).trim()
                  ? data.pharmacy_id
                  : '—'}
              </span>
            </span>
            <span className='min-w-0'>
              <span className='text-muted-foreground'>Адрес:</span>{' '}
              <span className='font-medium'>{data.address?.trim() || '—'}</span>
            </span>
          </div>
        )}
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
                  <TableHead className='h-8 w-20' />
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
                          <div className='flex items-center justify-end gap-0.5'>
                            {canAdd && (
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='size-7 text-muted-foreground hover:text-foreground'
                                aria-label={`Редактировать: ${row.promo} — ${row.subtype}`}
                                title='Редактировать'
                                disabled={deleting}
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className='size-4' />
                              </Button>
                            )}
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='size-7 text-muted-foreground hover:text-destructive'
                              aria-label={`Удалить: ${row.promo} — ${row.subtype}`}
                              title='Удалить'
                              disabled={deleting}
                              onClick={() => handleDelete(equipmentId)}
                            >
                              {deleting ? (
                                <Loader2 className='size-4 animate-spin' />
                              ) : (
                                <Trash2 className='size-4' />
                              )}
                            </Button>
                          </div>
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
          <EquipmentForm
            key={addFormKey}
            idPrefix='hardware-add'
            meta={meta}
            busy={saveMutation.isPending}
            submitLabel='Добавить'
            submitIcon={<Plus className='size-4' />}
            onSubmit={(draft) => {
              setNotice(null)
              saveMutation.mutate(draft)
            }}
          />
        )}

        {notice && <p className='text-sm text-destructive'>{notice}</p>}
      </CardContent>

      <Dialog
        open={editingRow !== null}
        onOpenChange={(open) => {
          if (!open && !updating) setEditingRow(null)
        }}
      >
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Редактировать оборудование</DialogTitle>
            <DialogDescription>
              {editingRow
                ? `${editingRow.promo || '—'} — ${editingRow.subtype || '—'}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {editingRow && editingId != null && (
            <EquipmentForm
              key={editingId}
              idPrefix='hardware-edit'
              initial={editingRow}
              meta={meta}
              busy={updating}
              submitLabel='Сохранить'
              submitIcon={<Save className='size-4' />}
              submitVariant='default'
              onCancel={() => setEditingRow(null)}
              onSubmit={(draft) => {
                setEditNotice(null)
                updateMutation.mutate({ equipmentId: editingId, draft })
              }}
            />
          )}
          {editNotice && (
            <p className='text-sm text-destructive'>{editNotice}</p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/**
 * Промо + Подтип (photo gallery) + Размер + имидж (must-have Промо) +
 * installation photos, and the submit button — the add section, and (with
 * `initial`) the Редактировать dialog, where the row's own photos are listed
 * too and can be removed. Holds its own state; remount it (`key`) to reset.
 * Submit needs a Подтип, an имидж when the Промо requires one, and at least
 * one photo left after removals + additions.
 */
function EquipmentForm({
  idPrefix,
  initial,
  meta,
  busy,
  submitLabel,
  submitIcon,
  submitVariant = 'outline',
  onSubmit,
  onCancel,
}: {
  /** Prefix for the inputs' ids (add form and dialog can both be mounted). */
  idPrefix: string
  /** The row being edited — its values and photos fill the form. */
  initial?: PharmacyHardwareRow
  meta: PharmacyEquipmentMeta | undefined
  busy: boolean
  submitLabel: string
  submitIcon: React.ReactNode
  submitVariant?: 'outline' | 'default'
  onSubmit: (draft: EquipmentDraft) => void
  onCancel?: () => void
}) {
  const [promo, setPromo] = useState(initial?.promo ?? '')
  const [subtype, setSubtype] = useState(initial?.subtype ?? '')
  const [size, setSize] = useState(initial?.size ?? '')
  const [imidzh, setImidzh] = useState(initial?.imidzh ?? '')
  // The row's saved photos still kept, and the ids of the ones removed.
  const [keptPhotos, setKeptPhotos] = useState<PharmacyHardwarePhoto[]>(
    initial?.photos ?? []
  )
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<number[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])

  // Every object URL still alive — each one pins its file in memory until
  // revoked, so they're released on removal and when the form unmounts
  // (after a save, the add form is remounted).
  const objectUrls = useRef(new Set<string>())
  useEffect(() => {
    const urls = objectUrls.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const promoOptions = meta?.promos.map((p) => p.name) ?? PROMO_CODES
  // Подтип + Размер from the backend (prm_pos_classification, by the user's
  // brand); names are matched to frontend photos here.
  const subtypesPromo = apiSubtypePromo(promo)
  const subtypesQuery = useQuery({
    queryKey: ['pharmacy-equipment-subtypes', subtypesPromo],
    queryFn: async () => {
      const res = await api.get<PharmacyEquipmentSubtypes>(
        '/sales/api/pharmacy/equipment/subtypes/',
        { params: { promo: subtypesPromo } }
      )
      return res.data
    },
    enabled: subtypesPromo !== null,
    staleTime: 5 * 60 * 1000,
  })
  const apiSubtypeList: PromoSubtype[] = (
    subtypesQuery.data?.subtypes ?? []
  ).map((s) => ({
    name: s.podtip,
    brand: subtypesQuery.data?.brand ?? '',
    size: s.razmer,
    photo: photoForSubtype(s.podtip, subtypesQuery.data?.brand ?? ''),
  }))
  const requiresImidzh = Boolean(
    meta?.promos.find((p) => p.name === promo)?.requires_imidzh
  )

  const handleSubtypeChange = (value: string) => {
    setSubtype(value)
    // The API's размер as-is (may be text, e.g. «индивидуальные»).
    setSize(
      isPhotoOnlyPromo(promo)
        ? (apiSubtypeList.find((s) => s.name === value)?.size ?? '')
        : catalogSize(promo, value)
    )
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
    if (objectUrls.current.delete(photo.url)) URL.revokeObjectURL(photo.url)
  }

  const handleRemoveKeptPhoto = (photo: PharmacyHardwarePhoto) => {
    setKeptPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    setDeletedPhotoIds((prev) => [...prev, photo.id])
  }

  // at least one installation photo, for every Промо
  const photoCount = keptPhotos.length + pendingPhotos.length
  const canSubmit =
    Boolean(promo) &&
    Boolean(subtype) &&
    (!requiresImidzh || Boolean(imidzh)) &&
    photoCount > 0 &&
    !busy

  const submit = () =>
    onSubmit({
      promo,
      subtype,
      size: size.trim(),
      imidzh: requiresImidzh ? imidzh : '',
      newPhotos: pendingPhotos.map((p) => p.file),
      deletePhotoIds: deletedPhotoIds,
    })

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      <PromoFields
        promo={promo}
        subtype={subtype}
        promoOptions={promoOptions}
        onPromoChange={(v) => {
          setPromo(v)
          setSubtype('')
          setSize('')
          setImidzh('')
        }}
        onSubtypeChange={handleSubtypeChange}
        apiSubtypes={{
          list: apiSubtypeList,
          loading: subtypesQuery.isLoading,
          error: subtypesQuery.isError,
        }}
      />
      <div className='space-y-1.5'>
        <Label htmlFor={`${idPrefix}-size`}>Размер</Label>
        <Input
          id={`${idPrefix}-size`}
          value={size}
          onChange={(e) => setSize(e.target.value)}
          // API-backed Промо: Размер is the picked Подтип's own — never typed.
          disabled={!subtype || isPhotoOnlyPromo(promo)}
          placeholder={isPhotoOnlyPromo(promo) ? '' : '180*30*20'}
        />
      </div>
      {/* Must-have Промо: the POS имидж opens once a Подтип is picked, and
          both are required. */}
      {requiresImidzh && subtype && (
        <ImidzhPicker
          brand={meta?.brand ?? ''}
          names={meta?.imidzh ?? []}
          value={imidzh}
          onChange={setImidzh}
          disabled={busy}
        />
      )}
      <div className='space-y-1.5 sm:col-span-2'>
        <Label htmlFor={`${idPrefix}-photos`}>
          Фото с места установки <span className='text-destructive'>*</span>
        </Label>
        <Input
          id={`${idPrefix}-photos`}
          type='file'
          accept='image/*'
          multiple
          disabled={busy}
          onChange={handlePhotosPicked}
        />
        {photoCount > 0 ? (
          <div className='flex flex-wrap gap-2 pt-1'>
            {keptPhotos.map((photo, idx) => (
              <PhotoThumb
                key={`kept-${photo.id}`}
                src={photo.url}
                alt={photo.name || `Фото ${idx + 1}`}
                removeLabel={`Удалить фото ${photo.name || idx + 1}`}
                disabled={busy}
                onRemove={() => handleRemoveKeptPhoto(photo)}
              />
            ))}
            {pendingPhotos.map((photo, idx) => (
              <PhotoThumb
                key={photo.url}
                src={photo.url}
                alt={`Новое фото ${idx + 1}`}
                removeLabel={`Убрать фото ${idx + 1}`}
                disabled={busy}
                onRemove={() => handleRemovePendingPhoto(photo)}
              />
            ))}
          </div>
        ) : (
          initial && (
            <p className='text-xs text-destructive'>
              Нужно хотя бы одно фото с места установки
            </p>
          )
        )}
      </div>
      <div className='flex items-start gap-2 sm:pt-5'>
        <Button
          type='button'
          variant={submitVariant}
          onClick={submit}
          disabled={!canSubmit}
        >
          {busy ? <Loader2 className='size-4 animate-spin' /> : submitIcon}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            type='button'
            variant='ghost'
            onClick={onCancel}
            disabled={busy}
          >
            Отмена
          </Button>
        )}
      </div>
    </div>
  )
}

// A photo preview with a × to remove it (a saved photo or a newly picked one).
function PhotoThumb({
  src,
  alt,
  removeLabel,
  disabled,
  onRemove,
}: {
  src: string
  alt: string
  removeLabel: string
  disabled?: boolean
  onRemove: () => void
}) {
  return (
    <div className='relative'>
      <img
        src={src}
        alt={alt}
        className='size-16 rounded-md border object-cover'
      />
      <button
        type='button'
        aria-label={removeLabel}
        disabled={disabled}
        onClick={onRemove}
        className='absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-50'
      >
        <X className='size-3' />
      </button>
    </div>
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
