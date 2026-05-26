"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { LayertoneMark } from "@/components/brand/layertone-mark";
import { I } from "@/components/icons";

export function Sidebar(props: {
  brands: Array<{ id: string; name: string }>;
  planCode: string;
}) {
  const pathname = usePathname() ?? "/";
  const planName =
    props.planCode === "subscription"
      ? "Subscription"
      : props.planCode === "payg"
        ? "Pay As You Go"
        : props.planCode === "pro" || props.planCode === "starter" || props.planCode === "business" || props.planCode === "agency"
          ? "Subscription"
          : "Free";
  const isActive = (path: string): boolean =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <div className="sidebar">
      <Link href="/" className="sidebar__brand" style={{ textDecoration: "none" }}>
        <LayertoneMark size={42} />
        <span>
          Layer<b>tone</b>
        </span>
      </Link>

      <Link
        href="/generate"
        className={`nav-item nav-item--cta ${isActive("/generate") ? "is-active" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <I.Sparkle size={18} className="nav-item__icon" />
        <span>Generate</span>
        <span className="nav-item__shortcut">G</span>
      </Link>

      <Link
        href="/history"
        className={`nav-item ${isActive("/history") ? "is-active" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <I.History size={16} className="nav-item__icon" />
        <span>History</span>
      </Link>

      <div className="sidebar__section-title">Assets</div>

      <Link
        href="/brands"
        className={`nav-item ${isActive("/brands") ? "is-active" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <I.Briefcase size={16} className="nav-item__icon" />
        <span>Brands</span>
        <span className="nav-item__count">{props.brands.length}</span>
      </Link>

      <Link
        href="/products"
        className={`nav-item ${isActive("/products") ? "is-active" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <I.Tag size={16} className="nav-item__icon" />
        <span>Products</span>
      </Link>

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

      <div className="sidebar__bottom">
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
          className="sidebar__plan"
          style={{ textDecoration: "none" }}
        >
          <span className="sidebar__avatar">N</span>
          <strong>{planName} plan</strong>
          <I.ChevronDown size={14} />
        </Link>
      </div>
    </div>
  );
}
