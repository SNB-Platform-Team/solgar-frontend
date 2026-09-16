import axios, { type AxiosError } from 'axios'

// Django backend base URL, configured via .env (VITE_API_URL) — see .env.example.
// Left empty (relative) in dev: requests go to /sales/api/... on the Vite
// origin itself, and vite.config.ts proxies them to Django. This makes the
// browser treat the request as same-origin, so the Django session cookie is
// sent — a cross-port request (5173 → 8000) would otherwise be blocked as
// cross-site even with withCredentials. In production, point VITE_API_URL at
// the real API origin (or keep it empty if Django is served from the same origin).
const API_URL = import.meta.env.VITE_API_URL

/**
 * Shared axios instance for the Django REST backend (session-cookie auth).
 * `withCredentials` sends the Django session cookie along with each request;
 * the backend must allow this origin via django-cors-headers with
 * CORS_ALLOW_CREDENTIALS=True (no wildcard "*" origin) if API_URL is ever
 * set to a cross-origin value.
 */
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  // Axios' built-in xsrf handling below only attaches the header when it
  // detects the request as same-origin itself — the interceptor further
  // down is a more reliable belt-and-braces version of the same thing, so
  // both are kept.
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
})

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

const CSRF_SAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

// Reads the csrftoken cookie directly and attaches it to every
// state-changing request. Django rejects POST/PUT/PATCH/DELETE without a
// matching X-CSRFToken header even when the session cookie itself is valid.
api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase()
  if (method && CSRF_SAFE_METHODS.has(method)) {
    const token = readCookie('csrftoken')
    if (token) config.headers.set('X-CSRFToken', token)
  }
  return config
})

/**
 * Hits the Django endpoint that sets the csrftoken cookie. Call this once
 * at app startup (see main.tsx) — safe to call more than once (e.g. a page
 * that does its own state-changing requests calling it again defensively).
 */
export async function primeCsrf(): Promise<void> {
  await api.get('/sales/api/csrf/')
}

const LOGIN_PATH = '/login/'
// Assumed to mirror LOGIN_PATH's naming (Django's conventional logout URL
// when using django.contrib.auth's LogoutView) — adjust if the backend
// actually exposes it elsewhere.
const LOGOUT_PATH = '/logout/'

/**
 * Sends the browser to Django's own login page — a full page navigation
 * (not `router.navigate`), since that page is served by Django outside the
 * React app entirely. `next` should be the in-app path to return to once
 * Django's login flow finishes.
 */
export function redirectToLogin(next: string): void {
  window.location.href = `${LOGIN_PATH}?next=${encodeURIComponent(next)}`
}

/** Sends the browser to Django's logout endpoint — same reasoning as
 * `redirectToLogin`: a real session cookie can only be cleared server-side. */
export function redirectToLogout(): void {
  window.location.href = `${LOGOUT_PATH}?next=${encodeURIComponent(LOGIN_PATH)}`
}

// Guards against firing the redirect more than once if several requests
// fail with 401/403 around the same time (window.location.href assignment
// doesn't navigate away synchronously).
let redirectingToLogin = false

// A missing or expired Django session shows up as 401/403 from *any*
// endpoint — not just /sales/api/me/, which never itself returns 401/403
// (it's AllowAny and reports `authenticated: false` with a 200 instead; see
// lib/auth.ts). Whenever some other call hits this mid-session, bounce
// straight to Django's login page rather than leaving a broken screen up.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    if ((status === 401 || status === 403) && !redirectingToLogin) {
      redirectingToLogin = true
      redirectToLogin(window.location.pathname + window.location.search)
    }
    return Promise.reject(error)
  }
)
