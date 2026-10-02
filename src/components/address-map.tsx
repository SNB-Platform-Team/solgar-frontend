import { useEffect, useRef } from 'react'
import { type YandexMap, type YandexPlacemark } from '@/lib/yandex-maps'
import { useYandexMaps } from '@/hooks/use-yandex-maps'

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY

// No address picked yet — centers on Moscow, zoomed out to roughly all of
// Russia, same as every other "no location yet" default in this codebase.
const RUSSIA_CENTER: [number, number] = [55.75, 37.62]
const DEFAULT_ZOOM = 5
const PICKED_ZOOM = 15

interface AddressMapProps {
  /** point_x (longitude) as the form holds it — a plain string, possibly empty or non-numeric mid-edit. */
  pointX: string
  /** point_y (latitude) as the form holds it — same shape as pointX. */
  pointY: string
  /** Called with (lat, lng) whenever the user clicks the map. */
  onPick: (lat: number, lng: number) => void
}

/**
 * Shared Адрес-section map for Doctor/Pharmacy Entry — shows a pin at
 * point_x/point_y when both are set (from a geocode result or a previous
 * click) and reports clicks back via onPick so the caller can write them
 * into its own point_x/point_y state. Yandex Maps JS API (ru_RU), key from
 * VITE_YANDEX_MAPS_API_KEY.
 */
export function AddressMap({ pointX, pointY, onPick }: AddressMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<YandexMap | null>(null)
  const placemarkRef = useRef<YandexPlacemark | null>(null)

  // Read via a ref inside the map's click handler so the effect that
  // creates the map (below) doesn't need onPick as a dependency — it would
  // otherwise tear down and recreate the whole map on every render. Kept in
  // sync by its own effect rather than assigned during render.
  const onPickRef = useRef(onPick)
  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  const { ymaps, error } = useYandexMaps(YANDEX_MAPS_API_KEY)

  const lat = Number(pointY)
  const lng = Number(pointX)
  const hasPosition =
    pointY !== '' && pointX !== '' && !Number.isNaN(lat) && !Number.isNaN(lng)

  // Mounts the map once Yandex Maps itself is ready — ymaps.Map doesn't
  // exist before then. Only depends on `ymaps` so point_x/point_y edits
  // (handled by the effect below) never rebuild the map from scratch.
  useEffect(() => {
    if (!ymaps || !containerRef.current) return

    const map = new ymaps.Map(containerRef.current, {
      center: hasPosition ? [lat, lng] : RUSSIA_CENTER,
      zoom: hasPosition ? PICKED_ZOOM : DEFAULT_ZOOM,
      controls: ['zoomControl'],
    })
    mapRef.current = map

    map.events.add('click', (e) => {
      const coords = e.get('coords')
      onPickRef.current(coords[0], coords[1])
    })

    return () => {
      map.destroy()
      mapRef.current = null
      placemarkRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymaps])

  // Keeps the pin and center in sync with point_x/point_y as they change
  // from outside (a "Найти адрес" geocode result landing in them, or this
  // same component's own click handler writing back into the form).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ymaps) return

    if (!hasPosition) {
      if (placemarkRef.current) {
        map.geoObjects.remove(placemarkRef.current)
        placemarkRef.current = null
      }
      return
    }

    if (placemarkRef.current) {
      placemarkRef.current.geometry.setCoordinates([lat, lng])
    } else {
      placemarkRef.current = new ymaps.Placemark([lat, lng])
      map.geoObjects.add(placemarkRef.current)
    }
    map.setCenter([lat, lng], PICKED_ZOOM)
  }, [ymaps, hasPosition, lat, lng])

  if (error) {
    return (
      <div className='flex h-[400px] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground'>
        {error}
      </div>
    )
  }

  return (
    <div className='relative h-[400px] w-full overflow-hidden rounded-md border'>
      <div ref={containerRef} className='h-full w-full' />
      {!ymaps && (
        <div className='absolute inset-0 flex items-center justify-center bg-card/60 text-sm text-muted-foreground'>
          Загрузка карты…
        </div>
      )}
    </div>
  )
}
