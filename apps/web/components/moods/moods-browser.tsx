"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export function MoodsBrowser(props: {
  moods: Array<{
    id: string;
    name: string;
    kind: string;
    validFrom: string | null;
    validTo: string | null;
    accentPalette: string[];
  }>;
}) {
  type MoodGroup = [label: string, items: typeof props.moods];
  const [tab, setTab] = useState<"all" | "rightNow" | "always" | "comingSoon">("all");
  const [query, setQuery] = useState("");
  const now = Date.now();

  const groups = useMemo(() => {
    const filtered = props.moods.filter((mood) =>
      mood.name.toLowerCase().includes(query.toLowerCase()),
    );

    const rightNow = filtered.filter((mood) => {
      if (mood.kind !== "seasonal") {
        return false;
      }
      const from = mood.validFrom ? new Date(mood.validFrom).getTime() : -Infinity;
      const to = mood.validTo ? new Date(mood.validTo).getTime() : Infinity;
      return from <= now && to >= now;
    });
    const always = filtered.filter((mood) => mood.kind === "evergreen");
    const comingSoon = filtered.filter((mood) => {
      if (mood.kind !== "seasonal" || !mood.validFrom) {
        return false;
      }
      return new Date(mood.validFrom).getTime() > now;
    });

    return { rightNow, always, comingSoon };
  }, [now, props.moods, query]);

  const visibleGroups: MoodGroup[] =
    tab === "all"
      ? [
          ["Right now", groups.rightNow],
          ["Always", groups.always],
          ["Coming soon", groups.comingSoon],
        ]
      : tab === "rightNow"
        ? [["Right now", groups.rightNow]]
        : tab === "always"
          ? [["Always", groups.always]]
          : [["Coming soon", groups.comingSoon]];

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>Moods</h1>
          <p>Curated style packs that stay aligned with your brand kit.</p>
        </div>
        <input
          className="studio-input"
          placeholder="Search moods…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="studio-tab-row">
        {[
          ["all", "All"],
          ["rightNow", "Right now"],
          ["always", "Always"],
          ["comingSoon", "Coming soon"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`studio-tab${tab === id ? " is-active" : ""}`}
            type="button"
            onClick={() => setTab(id as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleGroups.map(([label, items]) => (
        <section key={label} className="studio-page">
          {items.length > 0 ? <h2 className="studio-section-title">{label}</h2> : null}
          <div className="studio-mood-browser-grid">
            {items.map((mood) => (
              <Link key={mood.id} className="studio-mood-browser-card" href={`/generate?moodId=${mood.id}`}>
                <div className="studio-mood-browser-card__art" />
                <div className="studio-mood-browser-card__body">
                  <strong>{mood.name}</strong>
                  <span>{mood.kind}</span>
                  <div className="studio-swatch-row">
                    {mood.accentPalette.slice(0, 4).map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
