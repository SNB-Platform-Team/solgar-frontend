/**
 * Shape of GET /sales/api/storage-options/?country= — this is what feeds
 * Дистрибьютор (the prm_storages list for that country), not a separate
 * "storage" concept.
 */
export interface StorageOptionsResponse {
  storages: string[]
  country: string
}

/**
 * One row of a depo-upload preview. The parser is parametric — SALES vs
 * STOCK is inferred server-side from the uploaded file's name, not sent by
 * the client — but every row comes back with this same rich shape either
 * way. `type` is the brand-like classification (SOLGAR / NATURES BOUNTY)
 * that the summary counts below are grouped by.
 */
export interface DistributorUploadRow {
  index: number
  product: string
  city: string
  count: number
  amount: number
  client: string
  legal_address: string
  actual_address: string
  inn: string
  segment: string
  product_type: string
  type: string
  main_group: string
}

export interface DistributorUploadMeta {
  distributor: string
  country: string
  begin_date: string
  end_date: string
}

/** Brand-split totals — same convention as Sales Upload's summary panel. */
export interface DistributorUploadSummary {
  solgar_count: number
  solgar_amount: number
  bounty_count: number
  bounty_amount: number
}

/**
 * Shape of POST /sales/api/depo-upload/preview/ — the backend parses and
 * stores the *entire* file server-side as a "batch" (`batch_id`), and only
 * ever hands back one page of rows at a time; `rows` here is just page 1
 * (up to `page_size` of them), however many thousand rows `total_rows` is.
 * Further pages come from GET .../page/ keyed by `batch_id` — see
 * DistributorUploadPageResponse — not from re-parsing or re-sending the
 * file.
 */
export interface DistributorUploadPreviewResponse {
  batch_id: string
  rows: DistributorUploadRow[]
  page: number
  page_size: number
  total_rows: number
  num_pages: number
  /** SALES or STOCK — inferred from the file name, echoed back for save/. */
  type: string
  summary: DistributorUploadSummary
  meta: DistributorUploadMeta
  error: string
}

/** Shape of GET /sales/api/depo-upload/page/?batch_id=&page= */
export interface DistributorUploadPageResponse {
  batch_id: string
  rows: DistributorUploadRow[]
  page: number
  page_size: number
  total_rows: number
  num_pages: number
  error: string
}

/**
 * Shape of POST /sales/api/depo-upload/save/ — the request body is just
 * `{batch_id}`, nothing else: every row already lives server-side from the
 * preview step, so there's nothing to send back up.
 */
export interface DistributorUploadSaveResponse {
  created: number
  error: string
}
