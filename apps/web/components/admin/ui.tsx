import React from "react";

import { I } from "@/components/icons";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("en");

function toneClass(tone: Tone) {
  return tone === "neutral" ? "" : ` admin-tone--${tone}`;
}

export function formatAdminDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return dateTimeFormatter.format(value instanceof Date ? value : new Date(value));
}

export function formatAdminNumber(value: number | null | undefined) {
  return numberFormatter.format(value ?? 0);
}

export function AdminPage({
  eyebrow,
  title,
  description,
  actions,
  children,
  wide = false,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={`admin-page${wide ? " admin-page--wide" : ""}`}>
      <header className="admin-page__header">
        <div className="admin-page__heading">
          {eyebrow ? <div className="admin-eyebrow">{eyebrow}</div> : null}
          <h1>{title}</h1>
          {description ? <div className="admin-page__description">{description}</div> : null}
        </div>
        {actions ? <div className="admin-page__actions">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}

export function AdminSection({
  title,
  description,
  actions,
  children,
  flush = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section className={`admin-section${flush ? " admin-section--flush" : ""}`}>
      <div className="admin-section__header">
        <div>
          <h2>{title}</h2>
          {description ? <div className="admin-section__description">{description}</div> : null}
        </div>
        {actions ? <div className="admin-section__actions">{actions}</div> : null}
      </div>
      <div className="admin-section__body">{children}</div>
    </section>
  );
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return <div className="admin-stat-grid">{children}</div>;
}

export function AdminStat({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`admin-stat${toneClass(tone)}`}>
      <div className="admin-stat__top">
        <span>{label}</span>
        {icon ? <span className="admin-stat__icon">{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function AdminAlert({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`admin-alert${toneClass(tone)}`} role="status">
      {children}
    </div>
  );
}

export function AdminStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (["completed", "complete", "active", "published"].includes(normalized)) {
    return (
      <span className="pill pill--green">
        <I.Check size={11} />
        {labelize(status)}
      </span>
    );
  }
  if (["failed", "failed_safety", "suspended", "banned", "archived"].includes(normalized)) {
    return (
      <span className="pill pill--red">
        <I.AlertCircle size={11} />
        {labelize(status)}
      </span>
    );
  }
  if (["running", "processing"].includes(normalized)) {
    return (
      <span className="pill pill--accent">
        <I.Loader size={11} className="spin" />
        {labelize(status)}
      </span>
    );
  }
  if (["draft", "read_only", "pending"].includes(normalized)) {
    return <span className="pill pill--amber">{labelize(status)}</span>;
  }
  return <span className="pill">{labelize(status)}</span>;
}

export function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AdminEmpty({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="admin-empty">
      {icon ? <div className="admin-empty__icon">{icon}</div> : null}
      <h2>{title}</h2>
      {children ? <div className="admin-empty__body">{children}</div> : null}
    </div>
  );
}
