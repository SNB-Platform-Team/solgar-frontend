import { useEffect, useState } from 'react'
import { loadYandexMaps, type YandexMapsApi } from '@/lib/yandex-maps'

/**
 * Loads the Yandex Maps JS API (shared singleton — see loadYandexMaps) and
 * reports back once `window.ymaps` is ready to use, or an error if the
 * script/key didn't work out.
 */
export function useYandexMaps(apiKey: string) {
  const [ymaps, setYmaps] = useState<YandexMapsApi | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    loadYandexMaps(apiKey)
      .then((api) => {
        if (!cancelled) setYmaps(api)
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [apiKey])

  // Derived, not set synchronously inside the effect above — a missing key
  // is known the moment this hook runs, it doesn't need an effect at all.
  const error = apiKey ? loadError : 'Не задан VITE_YANDEX_MAPS_API_KEY'

  return { ymaps, error }
}
