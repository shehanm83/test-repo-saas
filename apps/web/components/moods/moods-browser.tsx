"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";
import { UpgradeModal } from "@/components/billing/upgrade-modal";

interface Mood {
  id: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  group: "now" | "always" | "soon";
  img: string | null;
  colors: string[];
  motifs: string[];
  validFrom: string | null;
  validTo: string | null;
}

export function MoodsBrowser({ moods, locked = false }: { moods: Mood[]; locked?: boolean }) {
  const [tab, setTab] = useState<"all" | "now" | "always" | "soon">("all");
  const [search, setSearch] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const filtered = useMemo(
    () =>
      moods.filter((m) => {
        if (tab !== "all" && m.group !== tab) return false;
        if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [moods, tab, search],
  );

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">Moods</h1>
          <p className="page__sub">
            Curated style packs — seasonal flavor without abandoning your brand.
          </p>
        </div>
        <div style={{ position: "relative" }}>
          <I.Search
            size={14}
            style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }}
          />
          <input
            className="input"
            placeholder="Search moods…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: 280 }}
          />
        </div>
      </div>

      {locked ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Lock size={28} />
          </div>
          <div className="empty__title">Moods are not available on Free</div>
          <div className="empty__sub">
            Subscribe or buy credits to unlock the full mood library.
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn--accent btn--sm"
              onClick={() => setUpgradeOpen(true)}
            >
              Unlock Moods →
            </button>
          </div>
        </div>
      ) : null}

      {!locked ? (
        <div className="tabs" style={{ marginBottom: 24 }}>
          {(
            [
              ["all", "All"],
              ["now", "This season"],
              ["always", "Evergreen"],
              ["soon", "Upcoming"],
            ] as const
          ).map(([k, l]) => (
            <div
              key={k}
              className={`tab ${tab === k ? "is-active" : ""}`}
              onClick={() => setTab(k)}
            >
              {l}
            </div>
          ))}
        </div>
      ) : null}

      {!locked && filtered.length === 0 ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Library size={28} />
          </div>
          <div className="empty__title">No moods match</div>
          <div className="empty__sub">Try a different search or tab.</div>
        </div>
      ) : !locked ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          {filtered.map((m) => (
            <article key={m.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  aspectRatio: "1/1",
                  position: "relative",
                  background: "var(--cal-gray-100)",
                }}
              >
                {m.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.img}
                    alt={m.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
                {m.group === "soon" ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.45)",
                    }}
                  />
                ) : null}
                <div style={{ position: "absolute", left: 12, top: 12, display: "flex", gap: 6 }}>
                  <span className="pill pill--ring" style={{ height: 22, fontSize: 11 }}>
                    {m.kind}
                  </span>
                </div>
                {m.colors.length > 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      bottom: 12,
                      display: "flex",
                      gap: 4,
                    }}
                  >
                    {m.colors.map((c) => (
                      <span
                        key={c}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 100,
                          background: c,
                          boxShadow: "0 0 0 1.5px white",
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div style={{ padding: 14 }}>
                <div
                  style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--fg-1)" }}
                >
                  {m.name}
                </div>
                <div className="t-small" style={{ marginTop: 4, fontSize: 12 }}>
                  {seasonLabel(m)}
                </div>
                <Link
                  href={`/generate?mood=${m.id}`}
                  className="btn btn--secondary btn--sm"
                  style={{ marginTop: 12, textDecoration: "none", width: "100%" }}
                >
                  Use in Generate
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <UpgradeModal feature="moods" open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}

function seasonLabel(mood: Mood) {
  if (mood.kind !== "seasonal") return "Evergreen";
  if (mood.validFrom && mood.validTo) {
    return `Seasonal period ${formatMonthDay(mood.validFrom)} - ${formatMonthDay(mood.validTo)}`;
  }
  if (mood.validFrom) return `Seasonal period starts ${formatMonthDay(mood.validFrom)}`;
  if (mood.validTo) return `Seasonal period ends ${formatMonthDay(mood.validTo)}`;
  return "Seasonal";
}

function formatMonthDay(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
