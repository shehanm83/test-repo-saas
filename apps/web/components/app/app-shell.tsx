"use client";

import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Menu } from "lucide-react";

/** Client wrapper for the app grid: manages the mobile slide-in sidebar. */
export function AppShell(props: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className={`app${open ? " app--nav-open" : ""}`}>
      <button
        className="app-nav-toggle"
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={18} strokeWidth={2} />
      </button>
      <div className="app-nav-overlay" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="app__sidebar">{props.sidebar}</div>
      <div className="app__main">{props.children}</div>
    </div>
  );
}
