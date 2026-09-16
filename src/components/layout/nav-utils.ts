import { type NavItem, type NavLink } from './types'

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
