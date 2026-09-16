export interface DashboardCards {
  pharmacies: number
  doctors: number
  chains: number
  sales_total: number
}

export interface DashboardTopChain {
  name: string
  total: number
}

export interface DashboardMonthly {
  month: string
  total: number
}

export interface DashboardPeriod {
  begin: string
  end: string
  comp_type: string
}

/** Shape of GET /sales/api/dashboard/ */
export interface DashboardResponse {
  cards: DashboardCards
  top_chains: DashboardTopChain[]
  monthly: DashboardMonthly[]
  period: DashboardPeriod
}
