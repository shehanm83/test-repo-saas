"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import { AlertCircle, Check, History, Loader2, Search, Sparkles, X } from "lucide-react";

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

function StatusPill({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="pill pill--green">
        <Check size={11} />
        Complete
      </span>
    );
  }
  if (status === "failed" || status === "failed_safety") {
    return (
      <span className="pill pill--red">
        <AlertCircle size={11} />
        Failed
      </span>
    );
  }
  return (
    <span className="pill pill--amber">
      <Loader2 size={11} className="animate-spin" />
      {status}
    </span>
  );
}

export function HistoryList(props: {
  items: Item[];
  brands: Array<{ id: string; name: string }>;
  page: number;
  search: string;
  hasMore: boolean;
}) {
  const router = useRouter();
  const [brandFilter, setBrandFilter] = useState("all");
  const [searchVal, setSearchVal] = useState(props.search);

  const filtered = useMemo(
    () =>
      props.items.filter((g) => {
        if (brandFilter !== "all" && g.brandId !== brandFilter) return false;
        return true;
      }),
    [props.items, brandFilter],
  );

  const buildSearchHref = useCallback(
    (term: string, targetPage = 0) =>
      `/history?page=${targetPage}${term ? `&search=${encodeURIComponent(term)}` : ""}`,
    [],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        router.push(buildSearchHref(searchVal));
      }
    },
    [router, searchVal, buildSearchHref],
  );

  const handleClearSearch = useCallback(() => {
    setSearchVal("");
    router.push("/history?page=0");
  }, [router]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
            <History size={11} /> Your work
          </p>
          <h1 className="page__title">History</h1>
          <p className="page__sub">{props.items.length} generations across all brands.</p>
        </div>
        <Link href="/generate" className="btn btn--accent">
          <Sparkles size={14} />
          New generation
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative max-w-[360px] flex-1">
          <Search size={14} className="absolute left-3.5 top-[11px] text-ink-soft/70" />
          <input
            className="input !rounded-full !pl-9"
            placeholder="Search briefs…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{ paddingRight: props.search ? 36 : undefined }}
          />
          {props.search ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-[9px] flex items-center text-ink-soft/70 hover:text-ink"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        <select
          className="select !w-40 !rounded-full"
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
        <select className="select !w-40 !rounded-full" defaultValue="30">
          <option value="30">Last 30 days</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty card mt-6">
          <div className="empty__art">
            <History size={32} />
          </div>
          <div className="empty__title">No generations yet</div>
          <div className="empty__sub">Try one — it&apos;s quick.</div>
          <Link href="/generate" className="btn btn--accent">
            <Sparkles size={14} />
            New generation
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <div
              key={g.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/generations/${g.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/generations/${g.id}`);
              }}
              className="card group flex cursor-pointer flex-col overflow-hidden !p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float"
            >
              <div className="grid aspect-[2/1] grid-cols-2 gap-0.5 bg-cream-deep">
                {[0, 1].map((j) => {
                  const im = g.thumbs[j] ?? null;
                  return (
                    <div key={j} className="overflow-hidden bg-cream-deep">
                      {im ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={im}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <p className="line-clamp-2 text-sm leading-snug text-ink">{g.brief}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="pill">
                    <span className="dot" style={{ background: dot(g.brandId ?? "unbranded") }} />
                    {g.brandName}
                  </span>
                  {g.moodName ? <span className="pill">{g.moodName}</span> : null}
                  <span className="pill">{g.ar}</span>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-ink/8 pt-3">
                  <StatusPill status={g.status} />
                  <span className="font-mono text-[11px] text-ink-soft/80">
                    {g.credits} cr · {relativeTime(g.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(props.page > 0 || props.hasMore) && (
        <div className="mt-6 flex justify-center gap-2">
          {props.page > 0 ? (
            <Link href={buildSearchHref(props.search, props.page - 1)} className="btn btn--secondary btn--sm">
              Previous
            </Link>
          ) : null}
          {props.hasMore ? (
            <Link href={buildSearchHref(props.search, props.page + 1)} className="btn btn--secondary btn--sm">
              Next
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
