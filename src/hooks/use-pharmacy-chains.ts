import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Shape of GET /sales/api/pharmacy-upload/chains/?country= */
export interface PharmacyChainsResponse {
  chains: string[]
  country: string
}

/**
 * The single source of truth for the pharmacy-chain list, shared by every
 * screen that needs a Сеть dropdown for it (Sales Upload, Chain Report, …).
 * Backed by GET /sales/api/pharmacy-upload/chains/ — not the old, much
 * smaller ChainDefinition-backed lists some report filter-options endpoints
 * still return under their own `chains` field.
 *
 * Cascades off `country` exactly like Distributor Upload's Страна→
 * Дистрибьютор: empty country returns every chain, a country narrows the
 * list to that country's chains, and a country-locked user gets their own
 * country's list regardless of what's passed (enforced server-side too).
 * Same queryKey shape everywhere so visiting one screen with a given
 * country warms the cache for the others.
 *
 * No staleTime override: relies on the global default (see main.tsx) so a
 * stale in-memory list from an earlier session can't linger indefinitely if
 * the backend list changes.
 */
export function usePharmacyChains(
  country: string,
  options?: {
    /** Pass false to skip the request entirely until a country is picked —
     * matches Distributor Upload's `enabled: Boolean(effectiveCountry)` on
     * its storage-options query. Defaults to true (empty country fetches
     * every chain), for screens like Chain Report where "no country
     * selected" is itself a valid, immediately-usable "all countries"
     * report filter. */
    enabled?: boolean
  }
) {
  const { data, isLoading } = useQuery<PharmacyChainsResponse>({
    queryKey: ['pharmacy-upload-chains', country],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (country) params.set('country', country)
      const res = await api.get<PharmacyChainsResponse>(
        `/sales/api/pharmacy-upload/chains/?${params}`
      )
      return res.data
    },
    enabled: options?.enabled ?? true,
  })

  return {
    chains: data?.chains ?? [],
    isLoading,
  }
}
