// Minimal structural typing for the slice of the Yandex Maps JS API (v2.1)
// that AddressMap actually uses — there's no official/DefinitelyTyped
// package for it, and pulling in `any` everywhere would lose typechecking
// on every call site for no reason.
export interface YandexPlacemark {
  geometry: { setCoordinates(coords: [number, number]): void }
}

export interface YandexGeoObjects {
  add(object: YandexPlacemark): void
  remove(object: YandexPlacemark): void
}

export interface YandexMapEvent {
  get(key: 'coords'): [number, number]
}

export interface YandexMap {
  setCenter(coords: [number, number], zoom?: number): void
  geoObjects: YandexGeoObjects
  events: {
    add(event: 'click', handler: (e: YandexMapEvent) => void): void
  }
  destroy(): void
}

export interface YandexMapsApi {
  ready(callback: () => void): void
  Map: new (
    container: HTMLElement,
    state: { center: [number, number]; zoom: number; controls?: string[] }
  ) => YandexMap
  Placemark: new (coords: [number, number]) => YandexPlacemark
}

declare global {
  interface Window {
    ymaps?: YandexMapsApi
  }
}

const SCRIPT_ID = 'yandex-maps-api'

// Module-level singleton — every AddressMap instance on the page (Doctor
// Entry and Pharmacy Entry each mount their own) shares this one promise,
// so the <script> tag and its API key only ever go out over the wire once,
// no matter how many maps end up on screen.
let loadPromise: Promise<YandexMapsApi> | null = null

/**
 * Loads the Yandex Maps JS API (https://api-maps.yandex.ru/2.1/) once and
 * resolves with `window.ymaps` once `ymaps.ready()` fires. Safe to call
 * from multiple components/renders — they all await the same load.
 */
export function loadYandexMaps(apiKey: string): Promise<YandexMapsApi> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const onReady = () => {
      // window.ymaps is guaranteed by this point — the script that sets it
      // is what just called onload/already existed below.
      window.ymaps!.ready(() => resolve(window.ymaps!))
    }

    if (document.getElementById(SCRIPT_ID)) {
      if (window.ymaps) onReady()
      else
        document
          .getElementById(SCRIPT_ID)!
          .addEventListener('load', onReady, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`
    script.async = true
    script.onload = onReady
    script.onerror = () => reject(new Error('Не удалось загрузить Yandex Maps'))
    document.head.appendChild(script)
  })

  return loadPromise
}
