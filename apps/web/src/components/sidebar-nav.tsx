"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  /**
   * Extra paths this item owns. A hub whose destinations live at unrelated
   * URLs would otherwise leave the sidebar with nothing highlighted once the
   * user follows one of them.
   */
  matchPaths?: string[];
}

export function SidebarNav({ items }: { items: NavItem[] }): JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" role="navigation" aria-label="Main">
      <p className="sidebar-nav-label">Navigation</p>
      {items.map((item) => {
        const owned = [item.href, ...(item.matchPaths ?? [])];
        const isActive = owned.some((path) => pathname === path || pathname.startsWith(path + "/"));

        return (
          <Link
            key={item.href}
            href={item.href}
            className="sidebar-nav-item"
            data-active={isActive}
            aria-current={isActive ? "page" : undefined}
          >
            {item.icon ? (
              <span className="sidebar-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span className="sidebar-nav-text">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
