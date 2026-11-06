export interface FaqEntry {
  q: string
  a: string
}

/** A file listed under «Документы». */
export interface FaqDocument {
  id: number
  title: string
  /** Backend path to the file itself, e.g. /sales/api/faq/document/1/ */
  url: string
  /** File size in bytes */
  size: number
  content_type?: string
  /** True for PDFs/images, which the browser shows; others are downloaded. */
  inline?: boolean
}

/** A folder of documents (Marketing, HR, ...). Files in no folder come back
 * as a last folder named «Прочее», with no id. */
export interface FaqDocumentFolder {
  id: number | null
  name: string
  documents: FaqDocument[]
}

/** Shape of GET /sales/api/faq/ */
export interface FaqResponse {
  user_display: string
  my_screens: string[]
  faq: FaqEntry[]
  /** Flat list kept by the backend for older clients — use document_folders. */
  documents?: FaqDocument[]
  document_folders?: FaqDocumentFolder[]
}
