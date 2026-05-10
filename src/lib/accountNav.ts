// Pure helpers powering the AccountSidebar. Extracted so vitest can
// cover the href-resolution and active-state logic without rendering
// a server component (no React, no DOM, no Next.js runtime).

export type SidebarItem = {
  /** Stable id used as the section anchor on /account (e.g. "profile"). */
  id: string;
  /** UI label. */
  label: string;
  /** Set when the item navigates to a sibling route rather than a section. */
  href?: string;
};

const HUB_PATH = "/account";

/**
 * Resolve a sidebar item's href given the current pathname.
 *
 * Section anchors (no `href`):
 *   • From /account itself        → "#<id>"     (in-page scroll)
 *   • From any /account/subpage   → "/account#<id>" (cross-route + scroll)
 *
 * Subpage links (`href` set): always returns the explicit href so
 * the user can hop laterally between hubs.
 */
export function resolveSidebarHref(item: SidebarItem, currentPath: string): string {
  if (item.href) return item.href;
  return currentPath === HUB_PATH ? `#${item.id}` : `${HUB_PATH}#${item.id}`;
}

/**
 * Whether the sidebar item should be styled as the current page.
 *
 *   • Section anchors are "current" when the guest is on /account
 *     itself — we don't try to track which section is in the
 *     viewport (that would require client-side IntersectionObserver
 *     and isn't worth the cost here).
 *   • Subpage links are "current" only when their href matches the
 *     current path exactly (so /account/loyalty highlights the
 *     Loyalty entry, not Profile).
 *
 * On /account itself, no subpage entry is "current" — the page
 * is the hub, not any one subhub. Returning `true` for the anchor
 * items would mark every entry; we don't want a five-item nav with
 * five active rows. Instead, the section anchors as a group are
 * implicitly "current" when on /account; subpage links remain dim.
 */
export function isSidebarItemCurrent(item: SidebarItem, currentPath: string): boolean {
  if (item.href) return currentPath === item.href;
  return false;
}
