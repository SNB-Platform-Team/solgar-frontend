import { api } from '@/lib/api'

/**
 * GETs a file endpoint (e.g. an .xlsx export) through the shared axios
 * instance — so the session cookie and the 401/403 handling are the same as
 * every other request — and saves it under the server's Content-Disposition
 * filename, or `fallbackName` when there's none.
 */
export async function downloadFile(url: string, fallbackName: string) {
  const res = await api.get<Blob>(url, { responseType: 'blob' })
  const disposition = String(res.headers['content-disposition'] ?? '')
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  const name = match ? decodeURIComponent(match[1]) : fallbackName

  const href = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}
