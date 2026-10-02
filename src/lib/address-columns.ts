// The Pharmacy/Doctor list tables render fully dynamic columns straight
// from the backend (data.columns/data.rows) — there's no static field-name
// mapping on the frontend for them, unlike the Entry form's own typed
// PharmacyDetail/DoctorDetail. To flag "missing address" rows we have to
// find point_x/point_y/street by matching the column header text instead.
// A few aliases are listed per field since we can't read the backend's
// serializer to know the exact header it sends.
const POINT_X_ALIASES = ['point_x', 'долгота', 'lng', 'longitude']
const POINT_Y_ALIASES = ['point_y', 'широта', 'lat', 'latitude']
const STREET_ALIASES = ['street', 'улица']

function findColumnIndex(columns: string[], aliases: string[]): number {
  const normalized = columns.map((c) => c.trim().toLowerCase())
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias)
    if (idx !== -1) return idx
  }
  return -1
}

export interface AddressColumnIndexes {
  pointX: number
  pointY: number
  street: number
}

/** Resolves point_x/point_y/street to column indexes once per `columns`
 * array (it only changes when the backend response itself changes), so the
 * per-row check below doesn't re-scan the header on every row. */
export function findAddressColumns(columns: string[]): AddressColumnIndexes {
  return {
    pointX: findColumnIndex(columns, POINT_X_ALIASES),
    pointY: findColumnIndex(columns, POINT_Y_ALIASES),
    street: findColumnIndex(columns, STREET_ALIASES),
  }
}

function isEmptyCell(value: string | number | null | undefined): boolean {
  return value == null || String(value).trim() === ''
}

/**
 * True when point_x, point_y or street is empty on this row — "address
 * missing" per the Pharmacy/Doctor list screens. A field whose column
 * wasn't found at all (index -1) is skipped rather than treated as
 * missing, so an unexpected backend column layout never flags every row.
 */
export function isAddressMissing(
  row: (string | number | null)[],
  cols: AddressColumnIndexes
): boolean {
  return (
    (cols.pointX !== -1 && isEmptyCell(row[cols.pointX])) ||
    (cols.pointY !== -1 && isEmptyCell(row[cols.pointY])) ||
    (cols.street !== -1 && isEmptyCell(row[cols.street]))
  )
}
