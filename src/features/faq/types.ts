export interface FaqEntry {
  q: string
  a: string
}

/** Shape of GET /sales/api/faq/ */
export interface FaqResponse {
  user_display: string
  my_screens: string[]
  faq: FaqEntry[]
}
