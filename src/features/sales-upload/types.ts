/**
 * One row of a pharmacy-upload preview. Аптека № (aptekno) and Подгруппа
 * (subgroup) are pharmacy-upload-specific — the old sales-upload row shape
 * didn't carry either.
 */
export interface SalesUploadRow {
  index: number
  product: string
  brand: string
  pharmacy: string
  aptekno: string
  city: string
  count: number
  amount: number
  subgroup: string
}

export interface SalesUploadMeta {
  chain_name: string
  country: string
  report_date: string
  main_group: string
}

/** Brand-split counts — same convention as Distributor Upload's summary panel. */
export interface SalesUploadSummary {
  solgar_count: number
  bounty_count: number
}

/**
 * Shape of POST /sales/api/pharmacy-upload/preview/ — the backend parses
 * and stores the *entire* file server-side as a "batch" (`batch_id`), and
 * only ever hands back one page of rows at a time (200/page); `rows` here
 * is just page 1, however many thousand rows `total_rows` is. Further
 * pages come from GET .../page/ keyed by `batch_id` — see
 * SalesUploadPageResponse — not from re-parsing or re-sending the file.
 */
export interface SalesUploadPreviewResponse {
  batch_id: string
  rows: SalesUploadRow[]
  page: number
  page_size: number
  total_rows: number
  num_pages: number
  summary: SalesUploadSummary
  meta: SalesUploadMeta
  error: string
}

/** Shape of GET /sales/api/pharmacy-upload/page/?batch_id=&page= */
export interface SalesUploadPageResponse {
  batch_id: string
  rows: SalesUploadRow[]
  page: number
  page_size: number
  total_rows: number
  num_pages: number
  error: string
}

/**
 * Shape of POST /sales/api/pharmacy-upload/save/ — the request body is just
 * `{batch_id}`, nothing else: every row already lives server-side from the
 * preview step, so there's nothing to send back up.
 */
export interface SalesUploadSaveResponse {
  created: number
  error: string
}
