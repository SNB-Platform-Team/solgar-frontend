export interface Employee {
  username: string
  name: string
  email: string
  phone: string
  department: string
  status: string
  status_label: string
  role: string
}

/** Shape of GET /sales/api/employees/?search=&page= */
export interface EmployeesApiResponse {
  rows: Employee[]
  total_rows: number
  page: number
  num_pages: number
  has_prev: boolean
  has_next: boolean
  search: string
}
