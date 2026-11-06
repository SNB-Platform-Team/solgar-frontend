import { type MeResponse } from './auth'

/**
 * Screen codes the backend hands back in /sales/api/me/'s `screens` — one
 * per access-controlled page (a superuser gets every code).
 */
export const SCREENS = {
  DASHBOARD: 'DASHBOARD',
  SALES_UPLOAD: 'SALES_UPLOAD',
  CHAIN_REPORT: 'CHAIN_REPORT',
  DIST_UPLOAD: 'DIST_UPLOAD',
  SALES_OBS: 'SALES_OBS',
  PHARMACY: 'PHARMACY',
  DOCTOR: 'DOCTOR',
  PHARM_MGR: 'PHARM_MGR',
  DOCTOR_MGR: 'DOCTOR_MGR',
  ONEC_STOCK: 'ONEC_STOCK',
  ANALYTICS: 'ANALYTICS',
  EMPLOYEES: 'EMPLOYEES',
  FAQ: 'FAQ',
} as const

// First path segment → required screen. Anything not listed here (HRlink,
// Битрикс24, settings, ...) has no screen code and stays open to everyone.
const SCREEN_BY_SEGMENT: Record<string, string> = {
  'sales-upload': SCREENS.SALES_UPLOAD,
  'chain-report': SCREENS.CHAIN_REPORT,
  'distributor-upload': SCREENS.DIST_UPLOAD,
  'sales-obs': SCREENS.SALES_OBS,
  pharmacies: SCREENS.PHARMACY,
  doctors: SCREENS.DOCTOR,
  'pharm-managerial': SCREENS.PHARM_MGR,
  'doctor-managerial': SCREENS.DOCTOR_MGR,
  'onec-stock': SCREENS.ONEC_STOCK,
  'analytics-1c': SCREENS.ANALYTICS,
  employees: SCREENS.EMPLOYEES,
  faq: SCREENS.FAQ,
}

/** The screen code a URL path requires, or undefined if it's open to all. */
export function screenForPath(pathname: string): string | undefined {
  const segment = pathname.split('/')[1] ?? ''
  // Главная ('/') is open to every signed-in user, whatever their screens.
  if (segment === '') return undefined
  // /powerbi, /powerbi-obshiy, /powerbi-bounty, ...
  if (segment === 'powerbi' || segment.startsWith('powerbi-'))
    return SCREENS.ANALYTICS
  return SCREEN_BY_SEGMENT[segment]
}

/**
 * Whether this session may open a page guarded by `screen`. No screen
 * code → always allowed; a superuser → always allowed. If the backend
 * didn't send a `screens` list at all (an older API), nothing is hidden —
 * the backend's own permission checks remain the real gate either way.
 */
export function canAccessScreen(
  me: MeResponse | undefined,
  screen: string | undefined
): boolean {
  if (!screen) return true
  if (!me) return false
  if (me.is_superuser) return true
  if (!Array.isArray(me.screens)) return true
  return me.screens.includes(screen)
}
