import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, redirectToLogin, redirectToLogout } from './api'

/** Shape of GET /sales/api/me/ — AllowAny, always 200, never 401/403. */
export interface MeResponse {
  authenticated: boolean
  username: string
  display_name: string
  is_staff: boolean
}

async function fetchMe(): Promise<MeResponse> {
  const res = await api.get<MeResponse>('/sales/api/me/')
  return res.data
}

/**
 * Shared query definition for the current Django session. Used both by the
 * `_authenticated` route's `beforeLoad` guard — via `queryClient.ensureQueryData`,
 * so the check runs once per app load and is cached rather than refetched on
 * every navigation — and by `useAuthUser` below for display purposes.
 */
export const authMeQueryOptions = queryOptions({
  queryKey: ['auth-me'],
  queryFn: fetchMe,
  // The session doesn't change during a page's lifetime; a live session
  // ending mid-use is instead caught by the response interceptor in api.ts.
  staleTime: Infinity,
})

/**
 * The current session's display info. By the time any `_authenticated`
 * page renders, the route guard has already resolved and cached this query,
 * so this reads it back without an extra request or loading flicker.
 */
export function useAuthUser() {
  return useQuery(authMeQueryOptions).data
}

export { redirectToLogin, redirectToLogout }
