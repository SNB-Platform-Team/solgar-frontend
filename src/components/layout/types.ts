import { type LinkProps } from '@tanstack/react-router'

type User = {
  name: string
  email: string
  avatar: string
}

type Team = {
  name: string
  logo: React.ElementType
  plan: string
}

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

// A collapsible node's children can themselves be links or further
// collapsibles — Solgar Intern > Отчет по продажам > Аптечная сеть продаж
// is three levels deep, so this has to nest recursively rather than
// bottoming out at a fixed list of leaf links.
type NavCollapsible = BaseNavItem & {
  url?: never
  items: NavItem[]
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

type SidebarData = {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
