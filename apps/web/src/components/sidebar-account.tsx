"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export function SidebarUserCard({
  name,
  email,
  org,
}: {
  name: string;
  email: string;
  org?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.assign("/login");
  }

  return (
    <div className="sidebar-account" ref={ref}>
      <button
        type="button"
        className="sidebar-user"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className="sidebar-avatar">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{name}</span>
          {org ? <span className="sidebar-user-org">{org}</span> : null}
        </div>
      </button>

      {open ? (
        <div className="sidebar-dropdown">
          <div className="sidebar-dropdown-email">{email}</div>
          <Link href="/account" className="sidebar-dropdown-item" onClick={() => setOpen(false)}>
            Account settings
          </Link>
          <button type="button" className="sidebar-dropdown-item" onClick={handleLogout}>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
