/** Shape of GET /sales/api/profile/ */
export interface ProfileResponse {
  username: string
  first_name: string
  last_name: string
  email: string
  phone: string
  department: string
  user_type: string
  is_azure: boolean
  access_level: string | number
  is_staff: boolean
  display_name: string
}

/** Editable fields — POST /sales/api/profile/ body (returns a ProfileResponse). */
export interface ProfileUpdatePayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  department: string
}
