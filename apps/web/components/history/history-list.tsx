"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";

interface Item {
  id: string;
  brief: string;
  brandId: string | undefined;
  brandName: string;
  moodName: string | null;
  status: string;
  ar: string;
  credits: number;
  createdAt: string;
  thumbs: (string | null)[];
}

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
function dot(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 86400 * 2) return "Yesterday";
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function HistoryList(props: {
  items: Item[];
  brands: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [brandFilter, setBrandFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      props.items.filter((g) => {
        if (brandFilter !== "all" && g.brandId !== brandFilter) return false;
        if (search && !g.brief.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [props.items, brandFilter, search],
  );

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">History</h1>
          <p className="page__sub">
            {props.items.length} generations across all brands.
          </p>
        </div>
        <Link
          href="/generate"
          className="btn btn--accent"
          style={{ textDecoration: "none" }}
        >
          <I.Sparkle size={14} />
          New generation
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <I.Search
            size={14}
            style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }}
          />
          <input
            className="input"
            placeholder="Search briefs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="select"
          style={{ width: 160 }}
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
        >
          <option value="all">All brands</option>
          {props.brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select className="select" style={{ width: 160 }} defaultValue="all">
          <option value="all">All moods</option>
        </select>
        <select className="select" style={{ width: 140 }} defaultValue="all">
          <option value="all">All statuses</option>
        </select>
        <select className="select" style={{ width: 160 }} defaultValue="30">
          <option value="30">Last 30 days</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty card" style={{ marginTop: 24 }}>
          <div className="empty__art">
            <I.Inbox size={32} />
          </div>
          <div className="empty__title">No generations yet</div>
          <div className="empty__sub">Try one — it&apos;s quick.</div>
          <Link
            href="/generate"
            className="btn btn--accent"
            style={{ textDecoration: "none" }}
          >
            <I.Sparkle size={14} />
            New generation
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filtered.map((g, i) => (
            <div
              key={g.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/generations/${g.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/generations/${g.id}`);
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 1fr auto",
                gap: 16,
                padding: 16,
                alignItems: "center",
                cursor: "pointer",
                borderBottom:
                  i < filtered.length - 1 ? "1px solid var(--cal-gray-200)" : "0",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 2,
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  overflow: "hidden",
                  boxShadow: "var(--shadow-ring)",
                }}
              >
                {[0, 1, 2, 3].map((j) => {
                  const im = g.thumbs[j] ?? null;
                  return (
                    <div key={j} style={{ background: "var(--cal-gray-200)" }}>
                      {im ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={im}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--fg-1)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {g.brief}
                </div>
                <div
                  style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}
                >
                  <span className="pill">
                    <span className="dot" style={{ background: dot(g.brandId ?? g.id) }} />
                    {g.brandName}
                  </span>
                  {g.moodName ? <span className="pill">{g.moodName}</span> : null}
                  <span className="pill">{g.ar}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {g.status === "completed" ? (
                  <span className="pill pill--green">
                    <I.Check size={11} />
                    Complete
                  </span>
                ) : g.status === "failed" || g.status === "failed_safety" ? (
                  <span className="pill pill--red">
                    <I.AlertCircle size={11} />
                    Failed
                  </span>
                ) : (
                  <span className="pill pill--amber">
                    <I.Loader size={11} className="spin" />
                    {g.status}
                  </span>
                )}
                <div className="t-small" style={{ marginTop: 6, fontSize: 11 }}>
                  {g.credits} credits · {relativeTime(g.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
