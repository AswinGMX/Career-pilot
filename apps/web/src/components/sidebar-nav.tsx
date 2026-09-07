"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
}

export function SidebarNav({ items }: { items: NavItem[] }): JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" role="navigation" aria-label="Main">
      <p className="sidebar-nav-label">Navigation</p>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

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
