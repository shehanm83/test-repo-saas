"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export function HistoryList(props: {
  items: Array<{
    id: string;
    brief: string;
    brandName: string;
    moodName: string | null;
    status: string;
    createdAt: string;
  }>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () =>
      props.items.filter((item) => {
        if (status !== "all" && item.status !== status) {
          return false;
        }
        if (query && !item.brief.toLowerCase().includes(query.toLowerCase())) {
          return false;
        }
        return true;
      }),
    [props.items, query, status],
  );

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>History</h1>
          <p>Your latest generations across brands, moods, and formats.</p>
        </div>
      </div>

      <div className="studio-toolbar">
        <input
          className="studio-input"
          placeholder="Search briefs…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="studio-input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="studio-card">
        <div className="studio-history-list">
          {filtered.map((item) => (
            <Link key={item.id} className="studio-history-row" href={`/generations/${item.id}`}>
              <div className="studio-history-mosaic">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} />
                ))}
              </div>
              <div className="studio-history-copy">
                <strong>{item.brief}</strong>
                <span>
                  {item.brandName}
                  {item.moodName ? ` · ${item.moodName}` : ""} · {item.status}
                </span>
              </div>
              <time>{new Date(item.createdAt).toLocaleDateString()}</time>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

