import { useTranslation } from 'react-i18next'
import { useAuthUser } from '@/lib/auth'
import { canAccessScreen } from '@/lib/screens'
import { sidebarData } from './data/sidebar-data'
import { type NavGroup, type NavItem, type NavLink } from './types'

/**
 * Recursively collects every leaf link in a nav tree, paired with the chain
 * of ancestor group titles leading to it. Used wherever a nested menu has to
 * be presented flat — the icon-collapsed sidebar dropdown, and the command
 * palette's breadcrumb-style entries.
 */
export function flattenNavItems(
  items: NavItem[],
  path: string[] = []
): { path: string[]; item: NavLink }[] {
  return items.flatMap((item) =>
    item.items
      ? flattenNavItems(item.items, [...path, item.title])
      : [{ path, item }]
  )
}

/** True if `href` matches this item or any descendant at any depth. */
export function hasActiveDescendant(item: NavItem, href: string): boolean {
  if (!item.items) return false
  return item.items.some(
    (child) => child.url === href || hasActiveDescendant(child, href)
  )
}

/**
 * Drops every link `canSee` rejects, then every group left with no visible
 * children — at any depth, so an emptied sub-group (e.g. Продаж&Сток)
 * disappears along with its parent if that empties too.
 */
export function filterNavItems(
  items: NavItem[],
  canSee: (item: NavLink) => boolean
): NavItem[] {
  return items.flatMap<NavItem>((item) => {
    if (!item.items) return canSee(item) ? [item] : []
    const children = filterNavItems(item.items, canSee)
    return children.length ? [{ ...item, items: children }] : []
  })
}

/** Swaps every `title` for its translation (by `titleKey`), at any depth. */
function translateNavItems(
  items: NavItem[],
  t: (key: string, fallback: string) => string
): NavItem[] {
  return items.map((item) => {
    const title = item.titleKey ? t(item.titleKey, item.title) : item.title
    return item.items
      ? { ...item, title, items: translateNavItems(item.items, t) }
      : { ...item, title }
  })
}

/** The sidebar's nav groups, narrowed to the screens this user may open,
 * with titles in the current UI language. */
export function useVisibleNavGroups(): NavGroup[] {
  const me = useAuthUser()
  const { t } = useTranslation()
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback })
  return sidebarData.navGroups
    .map((group) => ({
      ...group,
      title: group.titleKey ? tr(group.titleKey, group.title) : group.title,
      items: translateNavItems(
        filterNavItems(group.items, (item) =>
          canAccessScreen(me, item.screen)
        ),
        tr
      ),
    }))
    .filter((group) => group.items.length > 0)
}
