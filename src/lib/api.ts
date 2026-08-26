import axios from 'axios'

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
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
})
