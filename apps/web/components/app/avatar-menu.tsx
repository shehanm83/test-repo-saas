"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@clerk/nextjs";

import { I } from "@/components/icons";

export function AvatarMenu(props: {
  authMode: "clerk" | "dev";
  email: string;
  isAdmin: boolean;
  dropUp?: boolean;
  /** Renders identity text beside the avatar so the whole row opens the menu. */
  identity?: { primary: string; secondary: string };
}) {
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
    <div ref={ref} style={{ position: "relative" }} className={props.identity ? "w-full" : ""}>
      <button
        type="button"
        className={
          props.identity
            ? "flex w-full items-center gap-2.5 rounded-xl p-1 text-left transition-colors hover:bg-ink/5"
            : "btn btn--icon btn--ghost"
        }
        onClick={() => setOpen((o) => !o)}
        style={
          props.identity
            ? undefined
            : {
                width: 32,
                height: 32,
                borderRadius: 100,
                background: "var(--cal-charcoal)",
                color: "white",
              }
        }
        aria-label="Account menu"
        aria-expanded={open}
      >
        {props.identity ? (
          <>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-deep text-[12px] font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight text-ink">
                {props.identity.primary}
              </span>
              <span className="block truncate text-[11px] text-ink-soft">
                {props.identity.secondary}
              </span>
            </span>
            <I.ChevronDown
              size={14}
              className={`shrink-0 text-ink-soft transition-transform ${open ? "" : "rotate-180"}`}
            />
          </>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 600 }}>{initials}</span>
        )}
      </button>
      {open ? (
        <div
          className="menu"
          style={{
            position: "absolute",
            ...(props.dropUp
              ? { bottom: "calc(100% + 6px)", left: 0 }
              : { top: "calc(100% + 6px)", right: 0 }),
            minWidth: 220,
          }}
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
          {props.authMode === "clerk" ? (
            <SignOutButton redirectUrl="/">
              <button className="menu-item" onClick={() => setOpen(false)} type="button">
                <I.LogOut size={14} /> Sign out
              </button>
            </SignOutButton>
          ) : (
            <Link
              href="/"
              className="menu-item"
              onClick={() => setOpen(false)}
              style={{ textDecoration: "none" }}
            >
              <I.LogOut size={14} /> Sign out
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
