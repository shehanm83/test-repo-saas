"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  Briefcase,
  ChevronDown,
  FolderOpen,
  HelpCircle,
  History,
  Images,
  Palette,
  Settings,
  Sparkles,
  Tag,
} from "lucide-react";

import { LayertoneMark } from "@/components/brand/layertone-mark";

const NAV_ITEM =
  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft " +
  "transition-colors duration-150 hover:bg-ink/5 hover:text-ink";
const NAV_ACTIVE = "!bg-brand-50 !text-brand-700";

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  count,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Link href={href} className={`${NAV_ITEM} ${active ? NAV_ACTIVE : ""}`}>
      <Icon size={16} strokeWidth={2} className={active ? "text-brand" : "text-ink-soft/80"} />
      <span className="flex-1">{label}</span>
      {typeof count === "number" ? (
        <span className="rounded-full bg-ink/6 px-2 py-0.5 font-mono text-[11px] text-ink-soft">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

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
        : props.planCode === "pro" ||
            props.planCode === "starter" ||
            props.planCode === "business" ||
            props.planCode === "agency"
          ? "Subscription"
          : "Free";
  const isActive = (path: string): boolean =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <div className="flex min-h-full flex-col gap-1 border-r border-ink/8 bg-cream/60 px-3 py-4 font-sans">
      <Link href="/" className="mb-4 flex items-center gap-2 px-2">
        <LayertoneMark size={38} />
        <span className="font-display text-[17px] tracking-tight text-ink">
          Layer<b>tone</b>
        </span>
      </Link>

      <Link
        href="/generate"
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
          isActive("/generate")
            ? "bg-ink-deep text-white shadow-pill-dark"
            : "bg-white text-ink shadow-card hover:-translate-y-px"
        }`}
      >
        <Sparkles
          size={16}
          strokeWidth={2.2}
          className={isActive("/generate") ? "text-brand-300" : "text-brand"}
        />
        <span className="flex-1">Generate</span>
        <kbd
          className={`rounded-md px-1.5 font-mono text-[11px] ${
            isActive("/generate") ? "bg-white/15" : "bg-ink/6 text-ink-soft"
          }`}
        >
          G
        </kbd>
      </Link>

      <div className="mt-2">
        <NavItem href="/history" icon={History} label="History" active={isActive("/history")} />
      </div>

      <p className="mb-1 mt-5 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft/60">
        Assets
      </p>
      <NavItem
        href="/brands"
        icon={Briefcase}
        label="Brands"
        active={isActive("/brands")}
        count={props.brands.length}
      />
      <NavItem href="/products" icon={Tag} label="Products" active={isActive("/products")} />
      <NavItem href="/projects" icon={FolderOpen} label="Projects" active={isActive("/projects")} />
      <NavItem href="/moods" icon={Palette} label="Mood library" active={isActive("/moods")} />
      <NavItem href="/stock" icon={Images} label="Stock library" active={isActive("/stock")} />

      <div className="grow" />

      <NavItem href="/settings" icon={Settings} label="Settings" active={isActive("/settings")} />
      <NavItem href="/help" icon={HelpCircle} label="Help" active={false} />
      <Link
        href="/billing"
        className="mt-2 flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-card transition-transform duration-150 hover:-translate-y-px"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 font-display text-xs text-brand-700">
          {planName[0]}
        </span>
        <span className="flex-1 text-[13px] font-semibold text-ink">{planName} plan</span>
        <ChevronDown size={14} className="text-ink-soft" />
      </Link>
    </div>
  );
}
