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
import { FormSelect } from './form-select'
import { PROMO_CODES, photoSubtypesFor, subtypesFor } from './promo-catalog'

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
}: {
  promo: string
  subtype: string
  onPromoChange: (value: string) => void
  onSubtypeChange: (value: string) => void
}) {
  const [galleryOpen, setGalleryOpen] = useState(false)
  const subtypes = subtypesFor(promo)
  const photoSubtypes = photoSubtypesFor(promo)
  const selected = subtypes.find((s) => s.name === subtype)

  return (
    <>
      <div className='space-y-1.5'>
        <Label>Промо</Label>
        <FormSelect
          value={promo}
          options={PROMO_CODES}
          onChange={onPromoChange}
        />
      </div>
      <div className='space-y-1.5'>
        <Label>Подтип</Label>
        <div className='flex gap-2'>
          <div className='min-w-0 flex-1'>
            <FormSelect
              value={subtype}
              options={subtypes.map((s) => s.name)}
              disabled={!promo}
              placeholder={promo ? 'Не выбрано' : 'Сначала выберите промо'}
              onChange={onSubtypeChange}
            />
          </div>
          {photoSubtypes.length > 0 && (
            <Button
              type='button'
              variant='outline'
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
    </>
  )
}
