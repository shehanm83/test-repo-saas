"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

import { I } from "@/components/icons";

export function AvatarMenu(props: { email: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = props.email.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn--icon btn--ghost"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 100,
          background: "var(--cal-charcoal)",
          color: "white",
        }}
        aria-label="Account menu"
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>{initials}</span>
      </button>
      {open ? (
        <div
          className="menu"
          style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 220 }}
        >
          <div style={{ padding: "8px 10px" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{props.email}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
              {props.isAdmin ? "Admin access enabled" : "Workspace member"}
            </div>
          </div>
          <div className="menu-divider" />
          <Link
            href="/settings"
            className="menu-item"
            onClick={() => setOpen(false)}
            style={{ textDecoration: "none" }}
          >
            <I.User size={14} /> Account
          </Link>
          <Link
            href="/billing"
            className="menu-item"
            onClick={() => setOpen(false)}
            style={{ textDecoration: "none" }}
          >
            <I.CreditCard size={14} /> Billing
          </Link>
          {props.isAdmin ? (
            <Link
              href="/admin/moods"
              className="menu-item"
              onClick={() => setOpen(false)}
              style={{ textDecoration: "none" }}
            >
              <I.Shield size={14} /> Admin
            </Link>
          ) : null}
          <div className="menu-divider" />
          <Link
            href="/"
            className="menu-item"
            onClick={() => setOpen(false)}
            style={{ textDecoration: "none" }}
          >
            <I.LogOut size={14} /> Sign out
          </Link>
        </div>
      ) : null}
    </div>
  );
}
