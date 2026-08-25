import axios from 'axios'

// Django backend base URL, configured via .env (VITE_API_URL) — see .env.example.
const API_URL = import.meta.env.VITE_API_URL

/**
 * Shared axios instance for the Django REST backend (session-cookie auth).
 * `withCredentials` sends the Django session cookie cross-port in dev;
 * the backend must allow this origin via django-cors-headers with
 * CORS_ALLOW_CREDENTIALS=True (no wildcard "*" origin).
 */
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
})
