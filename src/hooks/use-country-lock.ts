import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Shape of GET /sales/api/country-options/ — country access is per-user:
 * an admin (is_staff) gets every country and can pick freely (locked:
 * false); a country-restricted user gets only their own country back and
 * locked: true, meaning the dropdown shows it but can't be changed.
 */
export interface CountryOptionsResponse {
  countries: string[]
  locked: boolean
  user_country: string
  is_staff: boolean
}

/**
 * Shared country-lock state for every Solgar Intern screen with a Страна
 * filter. Wraps GET /sales/api/country-options/ (already used by
 * Distributor Upload) so all pages agree on the same rule: admins
 * (is_staff) see every country and can change it freely; everyone else is
 * pinned to their own country and can't change it.
 *
 * `countries` is ready to hand straight to a country dropdown's options —
 * it's already narrowed to just the user's own country when locked, same
 * as the raw API response.
 */
export function useCountryLock() {
  const { data, isLoading } = useQuery<CountryOptionsResponse>({
    queryKey: ['country-options'],
    queryFn: async () => {
      const res = await api.get<CountryOptionsResponse>(
        '/sales/api/country-options/'
      )
      return res.data
    },
  })

  return {
    countries: data?.countries ?? [],
    locked: data?.locked ?? false,
    userCountry: data?.user_country ?? '',
    isStaff: data?.is_staff ?? false,
    isLoading,
  }
}

/**
 * Resolves the country value a page should actually use: the user's own
 * country when locked (ignoring whatever local/draft state holds — a
 * locked user can never change it), otherwise the value currently picked.
 */
export function effectiveCountryOf(
  countryLock: Pick<
    ReturnType<typeof useCountryLock>,
    'locked' | 'userCountry'
  >,
  currentValue: string
): string {
  return countryLock.locked ? countryLock.userCountry : currentValue
}
