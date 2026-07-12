"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { LayertoneMark } from "@/components/brand/layertone-mark";
import { I } from "@/components/icons";

const groups = [
  {
    label: "Marketing",
    items: [
      { href: "/admin/landing-hero", label: "Landing Hero", icon: <I.Image size={16} /> },
      { href: "/admin/home-showcase", label: "Home Showcase", icon: <I.Layout size={16} /> },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/moods", label: "Moods", icon: <I.Library size={16} /> },
      { href: "/admin/templates", label: "Templates", icon: <I.Layout size={16} /> },
      { href: "/admin/stock", label: "Stock Library", icon: <I.Image size={16} /> },
    ],
  },
  {
    label: "Commerce",
    items: [{ href: "/admin/pricebook", label: "Pricebook", icon: <I.Coin size={16} /> }],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/generations", label: "Generation Inspector", icon: <I.Search size={16} /> },
      { href: "/admin/users", label: "Users & Workspaces", icon: <I.User size={16} /> },
      { href: "/admin/aup", label: "AUP Review", icon: <I.Shield size={16} /> },
    ],
  },
];

export function AdminShell(props: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = React.useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <div className="admin-shell">
      <button
        className="admin-menu-toggle"
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <I.X size={18} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      <div
        className={`admin-sidebar-overlay${open ? " is-open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside className={`admin-sidebar${open ? " is-open" : ""}`} aria-label="Admin navigation">
        <Link href="/admin/generations" className="admin-sidebar__brand" onClick={close}>
          <span className="admin-sidebar__mark">
            <LayertoneMark size={22} />
          </span>
          <span>
            <strong>Layertone Admin</strong>
            <span>Operations Console</span>
          </span>
        </Link>

        {groups.map((group) => (
          <nav key={group.label} className="admin-nav-group" aria-label={group.label}>
            <div className="admin-nav-group__label">{group.label}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ))}

        <div className="admin-sidebar__footer">
          <Link href="/generate" className="admin-sidebar__return" onClick={close}>
            <I.ArrowLeft size={15} />
            Back to App
          </Link>
        </div>
      </aside>
      <section className="admin-content">{props.children}</section>
    </div>
  );
}
