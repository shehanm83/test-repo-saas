"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

import { I } from "@/components/icons";

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
function dotColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
}

export function Sidebar(props: {
  brands: Array<{ id: string; name: string }>;
  planCode: string;
}) {
  const pathname = usePathname() ?? "/";
  const [brandsOpen, setBrandsOpen] = useState(true);
  const isActive = (path: string): boolean =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <div className="sidebar">
      <Link
        href="/"
        className={`nav-item ${pathname === "/" ? "is-active" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <I.Home size={16} className="nav-item__icon" />
        <span>Home</span>
      </Link>

      <div style={{ height: 8 }} />

      <Link href="/generate" className="nav-item nav-item--cta" style={{ textDecoration: "none" }}>
        <I.Sparkle size={16} />
        <span>Generate</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <span
            className="kbd"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.8)",
              boxShadow: "none",
            }}
          >
            G
          </span>
        </span>
      </Link>

      <div style={{ height: 12 }} />

      <Link
        href="/history"
        className={`nav-item ${isActive("/history") ? "is-active" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <I.History size={16} className="nav-item__icon" />
        <span>History</span>
      </Link>

      <div className={`nav-group ${brandsOpen ? "is-open" : ""}`}>
        <div className="nav-group__head" onClick={() => setBrandsOpen((o) => !o)}>
          <I.ChevronRight
            size={12}
            className="nav-group__chev"
            style={{ transform: brandsOpen ? "rotate(90deg)" : "" }}
          />
          <I.Briefcase size={16} style={{ color: "var(--fg-3)" }} />
          <span>Brands</span>
          <span className="nav-item__count" style={{ marginLeft: "auto" }}>
            {props.brands.length}
          </span>
          <Link
            href="/onboarding/brand/identify"
            className="nav-item__plus"
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: "none" }}
          >
            <I.Plus size={12} />
          </Link>
        </div>
        {brandsOpen ? (
          <div className="nav-sub">
            {props.brands.length === 0 ? (
              <div className="nav-sub__item" style={{ color: "var(--fg-4)" }}>
                No brands yet
              </div>
            ) : (
              props.brands.map((b) => {
                const active = pathname === `/brands/${b.id}`;
                return (
                  <Link
                    key={b.id}
                    href={`/brands/${b.id}`}
                    className={`nav-sub__item ${active ? "is-active" : ""}`}
                    style={
                      active
                        ? {
                            color: "var(--fg-1)",
                            background: "var(--cal-gray-100)",
                            textDecoration: "none",
                          }
                        : { textDecoration: "none" }
                    }
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 100,
                          background: dotColor(b.id),
                          flexShrink: 0,
                        }}
                      />
                      {b.name}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      <Link
        href="/projects"
        className={`nav-item ${isActive("/projects") ? "is-active" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <I.Folder size={16} className="nav-item__icon" />
        <span>Projects</span>
      </Link>

      <Link
        href="/moods"
        className={`nav-item ${isActive("/moods") ? "is-active" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <I.Library size={16} className="nav-item__icon" />
        <span>Mood library</span>
      </Link>

      <Link
        href="/stock"
        className={`nav-item ${isActive("/stock") ? "is-active" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <I.Image size={16} className="nav-item__icon" />
        <span>Stock library</span>
      </Link>

      <div className="grow" />

      <div
        style={{
          marginTop: "auto",
          paddingTop: 16,
          borderTop: "1px solid var(--cal-gray-200)",
        }}
      >
        <Link
          href="/settings"
          className={`nav-item ${isActive("/settings") ? "is-active" : ""}`}
          style={{ textDecoration: "none" }}
        >
          <I.Settings size={16} className="nav-item__icon" />
          <span>Settings</span>
        </Link>
        <Link href="/help" className="nav-item" style={{ textDecoration: "none" }}>
          <I.HelpCircle size={16} className="nav-item__icon" />
          <span>Help</span>
        </Link>
        <Link
          href="/billing"
          className="nav-item"
          style={{ marginTop: 4, textDecoration: "none" }}
        >
          <span className="pill pill--accent" style={{ height: 22, fontSize: 11 }}>
            <I.Crown size={11} />
            {props.planCode.charAt(0).toUpperCase() + props.planCode.slice(1)} plan
          </span>
        </Link>
      </div>
    </div>
  );
}
