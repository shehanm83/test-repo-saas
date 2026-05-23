"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { I } from "@/components/icons";

const items = [
  { href: "/admin/landing-hero", label: "Landing hero", icon: <I.Image size={16} /> },
  { href: "/admin/home-showcase", label: "Home showcase", icon: <I.Layout size={16} /> },
  { href: "/admin/moods", label: "Moods", icon: <I.Library size={16} /> },
  { href: "/admin/templates", label: "Templates", icon: <I.Layout size={16} /> },
  { href: "/admin/stock", label: "Stock", icon: <I.Image size={16} /> },
  { href: "/admin/pricebook", label: "Pricebook", icon: <I.Coin size={16} /> },
  { href: "/admin/generations", label: "Inspector", icon: <I.Search size={16} /> },
  { href: "/admin/users", label: "Users", icon: <I.User size={16} /> },
  { href: "/admin/aup", label: "AUP", icon: <I.Shield size={16} /> },
];

export function AdminShell(props: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        height: "calc(100vh - var(--header-h))",
      }}
    >
      <aside
        style={{
          background: "var(--cal-charcoal)",
          color: "white",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          className="t-eyebrow"
          style={{
            color: "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 12,
          }}
        >
          <I.Shield size={11} />
          ADMIN
        </div>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                color: active ? "white" : "rgba(255,255,255,0.7)",
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                textDecoration: "none",
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </aside>
      <section style={{ overflowY: "auto" }}>{props.children}</section>
    </div>
  );
}
