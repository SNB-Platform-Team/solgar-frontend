import { useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { FormSelect } from '@/components/form-select'
import {
  PROMO_CODES,
  type PromoSubtype,
  isPhotoOnlyPromo,
  photoSubtypesFor,
  subtypesFor,
} from './promo-catalog'

/**
 * Промо → Подтип cascade plus its photo gallery (only some Промо, e.g.
 * СТОЙКИ/КОРНЕР, have photos). Holds no value of its own: the card binds it
 * to the form, Оборудование to its own local state. Renders two grid cells.
 */
export function PromoFields({
  promo,
  subtype,
  onPromoChange,
  onSubtypeChange,
  promoOptions = PROMO_CODES,
  apiSubtypes,
}: {
  promo: string
  subtype: string
  /** Промо choices — the catalog's codes unless given. */
  promoOptions?: string[]
  onPromoChange: (value: string) => void
  onSubtypeChange: (value: string) => void
  /** Подтип list fetched from the backend (СТОЙКИ) — replaces the catalog's
   * for a photo-only Промо. */
  apiSubtypes?: { list: PromoSubtype[]; loading: boolean; error: boolean }
}) {
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [brokenPhotos, setBrokenPhotos] = useState<Set<string>>(() => new Set())
  // СТОЙКИ: Подтип only from the photo gallery — no text dropdown — and the
  // list is the backend's; every Подтип is a gallery card (its photo, or
  // just its name when no photo matches).
  const photoOnly = isPhotoOnlyPromo(promo)
  const subtypes = photoOnly ? (apiSubtypes?.list ?? []) : subtypesFor(promo)
  const photoSubtypes = photoOnly ? subtypes : photoSubtypesFor(promo)
  const selected = subtypes.find((s) => s.name === subtype)
  const listLoading = photoOnly && Boolean(apiSubtypes?.loading)
  const listError = photoOnly && Boolean(apiSubtypes?.error)

  return (
    <>
      <div className='space-y-1.5'>
        <Label>Промо</Label>
        <FormSelect
          value={promo}
          options={promoOptions}
          onChange={onPromoChange}
        />
      </div>
      <div className='space-y-1.5'>
        <Label>Подтип</Label>
        <div className='flex items-center gap-2'>
          {photoOnly ? (
            <span
              className={
                'min-w-0 flex-1 truncate text-sm' +
                (subtype ? ' font-medium' : ' text-muted-foreground')
              }
              title={subtype || undefined}
            >
              {subtype ||
                (listLoading
                  ? 'Загрузка подтипов…'
                  : listError
                    ? 'Не удалось загрузить подтипы'
                    : subtypes.length === 0
                      ? 'Нет подтипов'
                      : 'Не выбрано — выберите по фото')}
            </span>
          ) : (
            <div className='min-w-0 flex-1'>
              <FormSelect
                value={subtype}
                options={subtypes.map((s) => s.name)}
                disabled={!promo}
                placeholder={promo ? 'Не выбрано' : 'Сначала выберите промо'}
                onChange={onSubtypeChange}
              />
            </div>
          )}
          {(photoOnly || photoSubtypes.length > 0) && (
            <Button
              type='button'
              variant='outline'
              disabled={photoSubtypes.length === 0}
              onClick={() => setGalleryOpen(true)}
            >
              <ImageIcon className='size-4' />
              Выбрать фото
            </Button>
          )}
        </div>
        {selected && (
          <p className='text-xs text-muted-foreground'>
            Бренд: {selected.brand || '—'} · Габариты: {selected.size || '—'}
          </p>
        )}
      </div>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className='sm:max-w-4xl'>
          <DialogHeader>
            <DialogTitle>Выбрать фото — {promo}</DialogTitle>
            <DialogDescription>
              Нажмите на фото, чтобы выбрать подтип
            </DialogDescription>
          </DialogHeader>
          {/* Scrolls on its own so a long gallery never overflows the
              dialog; photos use object-contain at a fixed height so nothing
              (shelf labels etc.) gets cropped. */}
          <div className='max-h-[70vh] overflow-y-auto pe-1'>
            <div className='grid grid-cols-2 gap-4 lg:grid-cols-3'>
              {photoSubtypes.map((s) => (
                <button
                  key={s.name}
                  type='button'
                  onClick={() => {
                    onSubtypeChange(s.name)
                    setGalleryOpen(false)
                  }}
                  className={
                    'overflow-hidden rounded-md border text-start transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none' +
                    (subtype === s.name
                      ? ' border-primary ring-2 ring-primary'
                      : '')
                  }
                >
                  {s.photo && !brokenPhotos.has(s.name) ? (
                    <img
                      src={s.photo}
                      alt={s.name}
                      className='h-56 w-full bg-muted object-contain p-2'
                      onError={() =>
                        setBrokenPhotos((prev) => new Set(prev).add(s.name))
                      }
                    />
                  ) : (
                    <div className='flex h-56 w-full items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground'>
                      Нет фото
                    </div>
                  )}
                  <p className='mt-2 px-2 pb-2 text-center text-sm font-medium'>
                    {s.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
