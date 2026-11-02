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

/** The sidebar's nav groups, narrowed to the screens this user may open. */
export function useVisibleNavGroups(): NavGroup[] {
  const me = useAuthUser()
  return sidebarData.navGroups
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, (item) =>
        canAccessScreen(me, item.screen)
      ),
    }))
    .filter((group) => group.items.length > 0)
}
