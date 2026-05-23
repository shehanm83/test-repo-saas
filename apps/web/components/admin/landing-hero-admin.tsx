"use client";

import React, { useMemo, useState } from "react";

import type { LandingHeroSetCard, LandingHeroSetView } from "@layertone/shared/landing-hero";

import { I } from "@/components/icons";
import { HeroCardImage } from "@/components/marketing/hero-cards";

type SetStatus = LandingHeroSetView["status"];

function cloneSet(set: LandingHeroSetView): LandingHeroSetView {
  return JSON.parse(JSON.stringify(set)) as LandingHeroSetView;
}

function lineList(value: string[]) {
  return value.join("\n");
}

function parseLines(value: string, limit: number) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function colorValue(value: string | null | undefined, fallback = "#111827") {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : fallback;
}

export function LandingHeroAdmin({ rows }: { rows: LandingHeroSetView[] }) {
  const [sets, setSets] = useState(rows);
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const selected = useMemo(
    () => sets.find((set) => set.id === selectedId) ?? sets[0] ?? null,
    [sets, selectedId],
  );
  const [draft, setDraft] = useState<LandingHeroSetView | null>(
    selected ? cloneSet(selected) : null,
  );
  const [busy, setBusy] = useState<string | null>(null);

  function selectSet(id: string) {
    const next = sets.find((set) => set.id === id);
    setSelectedId(id);
    setDraft(next ? cloneSet(next) : null);
  }

  function patchDraft(patch: Partial<LandingHeroSetView>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function patchConfig(patch: Partial<LandingHeroSetView["config"]>) {
    setDraft((current) =>
      current ? { ...current, config: { ...current.config, ...patch } } : current,
    );
  }

  function patchCard(slot: number, patch: Partial<LandingHeroSetCard>) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        cards: current.cards.map((card) => (card.slot === slot ? { ...card, ...patch } : card)),
      };
    });
  }

  async function refresh(nextSelectedId?: string) {
    const res = await fetch("/api/admin/landing-hero");
    const next = (await res.json()) as LandingHeroSetView[];
    setSets(next);
    const id = nextSelectedId ?? selectedId;
    const selectedNext = next.find((set) => set.id === id) ?? next[0] ?? null;
    setSelectedId(selectedNext?.id ?? "");
    setDraft(selectedNext ? cloneSet(selectedNext) : null);
  }

  async function createSet() {
    setBusy("create");
    const res = await fetch("/api/admin/landing-hero", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "New hero set" }),
    });
    setBusy(null);
    const created = (await res.json()) as LandingHeroSetView;
    await refresh(created.id);
  }

  async function duplicateSet() {
    if (!draft) return;
    setBusy("duplicate");
    const res = await fetch("/api/admin/landing-hero", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ duplicateFrom: draft.id }),
    });
    setBusy(null);
    const created = (await res.json()) as LandingHeroSetView;
    await refresh(created.id);
  }

  async function saveSet(status?: SetStatus) {
    if (!draft) return;
    setBusy("save");
    const payload = {
      name: draft.name,
      weight: Number(draft.weight),
      status: status ?? draft.status,
      config: draft.config,
    };
    const res = await fetch(`/api/admin/landing-hero/${draft.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(null);
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await refresh(draft.id);
  }

  async function deleteSet() {
    if (!draft || !confirm(`Delete "${draft.name}"?`)) return;
    setBusy("delete");
    await fetch(`/api/admin/landing-hero/${draft.id}`, { method: "DELETE" });
    setBusy(null);
    await refresh();
  }

  async function saveCard(slot: number, file?: File | null) {
    if (!draft) return;
    const card = draft.cards.find((c) => c.slot === slot);
    if (!card) return;
    setBusy(`card-${slot}`);
    const fd = new FormData();
    fd.append("headline", card.headline);
    fd.append("sub", card.sub);
    fd.append("textPosition", card.textPosition);
    fd.append("textColor", card.textColor);
    fd.append("brandInitials", card.brandInitials);
    fd.append("brandColor", card.brandColor);
    fd.append("brandTextColor", card.brandTextColor);
    fd.append("badgeText", card.badgeText ?? "");
    fd.append("badgeBg", card.badgeBg ?? "");
    fd.append("badgeColor", card.badgeColor ?? "");
    if (!card.s3Key) fd.append("imageUrl", card.imageUrl);
    if (file) fd.append("file", file);
    const res = await fetch(`/api/admin/landing-hero/${draft.id}/cards/${slot}`, {
      method: "PATCH",
      body: fd,
    });
    setBusy(null);
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await refresh(draft.id);
  }

  const publishedCount = sets.filter((set) => set.status === "published").length;

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">Landing hero</h1>
          <p className="page__sub">
            Manage complete hero sets. A visitor sees one published set: brief, mood, brand, and
            four matching images stay together.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="pill pill--ring" style={{ height: 30, padding: "0 12px", gap: 6 }}>
            <I.Layout size={12} />
            <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>{publishedCount}</span>
            <span style={{ color: "var(--fg-3)" }}>published</span>
          </div>
          <button className="btn btn--primary" type="button" onClick={() => void createSet()}>
            <I.Plus size={14} />
            New set
          </button>
        </div>
      </div>

      {sets.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p className="t-small" style={{ color: "var(--fg-3)", marginTop: 0 }}>
            No hero sets yet.
          </p>
          <button className="btn btn--primary" type="button" onClick={() => void createSet()}>
            <I.Plus size={14} />
            Create first set
          </button>
        </div>
      ) : null}

      {draft ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card" style={{ padding: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 2,
              }}
            >
              {sets.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => selectSet(set.id)}
                  style={{
                    minWidth: 220,
                    minHeight: 58,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "10px 12px",
                    border: 0,
                    borderRadius: 8,
                    background: set.id === draft.id ? "var(--cal-gray-100)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>
                    <strong style={{ display: "block", color: "var(--fg-1)", fontSize: 13 }}>
                      {set.name}
                    </strong>
                    <span style={{ color: "var(--fg-3)", fontSize: 12 }}>
                      {set.status} · weight {set.weight}
                    </span>
                  </span>
                  {set.status === "published" ? <I.Check size={14} /> : null}
                </button>
              ))}
            </div>
          </div>

          <main style={{ display: "grid", gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <h2 className="t-h4" style={{ margin: 0 }}>
                  Set settings
                </h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn btn--ghost"
                    type="button"
                    onClick={() => void duplicateSet()}
                  >
                    <I.Copy size={14} />
                    Duplicate
                  </button>
                  <button className="btn btn--ghost" type="button" onClick={() => void deleteSet()}>
                    <I.Trash size={14} />
                    Delete
                  </button>
                  <button
                    className="btn btn--ghost"
                    type="button"
                    onClick={() => void saveSet("draft")}
                    disabled={busy === "save"}
                  >
                    Save draft
                  </button>
                  <button
                    className="btn btn--primary"
                    type="button"
                    onClick={() => void saveSet("published")}
                    disabled={busy === "save"}
                  >
                    Publish
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <label>
                  <span className="label">Name</span>
                  <input
                    className="input"
                    value={draft.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                  />
                </label>
                <label>
                  <span className="label">Status</span>
                  <select
                    className="select"
                    value={draft.status}
                    onChange={(e) => patchDraft({ status: e.target.value as SetStatus })}
                  >
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
                <label>
                  <span className="label">Weight</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={100}
                    value={draft.weight}
                    onChange={(e) => patchDraft({ weight: Number(e.target.value) })}
                  />
                </label>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
                Hero copy
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <label>
                  <span className="label">Headline line 1</span>
                  <input
                    className="input"
                    value={draft.config.headline.line1}
                    onChange={(e) =>
                      patchConfig({
                        headline: { ...draft.config.headline, line1: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Headline final phrase</span>
                  <input
                    className="input"
                    value={draft.config.headline.line2Suffix}
                    onChange={(e) =>
                      patchConfig({
                        headline: { ...draft.config.headline, line2Suffix: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Line 2 word 1</span>
                  <input
                    className="input"
                    value={draft.config.headline.line2Prefix}
                    onChange={(e) =>
                      patchConfig({
                        headline: { ...draft.config.headline, line2Prefix: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Line 2 word 2</span>
                  <input
                    className="input"
                    value={draft.config.headline.line2Middle}
                    onChange={(e) =>
                      patchConfig({
                        headline: { ...draft.config.headline, line2Middle: e.target.value },
                      })
                    }
                  />
                </label>
                <textarea
                  className="input"
                  rows={3}
                  style={{ gridColumn: "1 / -1" }}
                  value={draft.config.lede}
                  onChange={(e) => patchConfig({ lede: e.target.value })}
                />
                <label>
                  <span className="label">Primary CTA label</span>
                  <input
                    className="input"
                    value={draft.config.primaryCta.label}
                    onChange={(e) =>
                      patchConfig({
                        primaryCta: { ...draft.config.primaryCta, label: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Primary CTA href</span>
                  <input
                    className="input"
                    value={draft.config.primaryCta.href}
                    onChange={(e) =>
                      patchConfig({
                        primaryCta: { ...draft.config.primaryCta, href: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Secondary CTA label</span>
                  <input
                    className="input"
                    value={draft.config.secondaryCta.label}
                    onChange={(e) =>
                      patchConfig({
                        secondaryCta: { ...draft.config.secondaryCta, label: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Secondary CTA href</span>
                  <input
                    className="input"
                    value={draft.config.secondaryCta.href}
                    onChange={(e) =>
                      patchConfig({
                        secondaryCta: { ...draft.config.secondaryCta, href: e.target.value },
                      })
                    }
                  />
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={draft.config.secondaryCta.enabled}
                    onChange={(e) =>
                      patchConfig({
                        secondaryCta: {
                          ...draft.config.secondaryCta,
                          enabled: e.target.checked,
                        },
                      })
                    }
                  />
                  Secondary CTA enabled
                </label>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
                Prompt, proof, and trust
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <label>
                  <span className="label">Brief</span>
                  <textarea
                    className="input"
                    rows={4}
                    value={draft.config.prompt.brief}
                    onChange={(e) =>
                      patchConfig({
                        prompt: { ...draft.config.prompt, brief: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Proof items</span>
                  <textarea
                    className="input"
                    rows={4}
                    value={lineList(draft.config.proofItems)}
                    onChange={(e) => patchConfig({ proofItems: parseLines(e.target.value, 4) })}
                  />
                </label>
                <label>
                  <span className="label">Brand name</span>
                  <input
                    className="input"
                    value={draft.config.prompt.brandName}
                    onChange={(e) =>
                      patchConfig({
                        prompt: { ...draft.config.prompt, brandName: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Brand initials</span>
                  <input
                    className="input"
                    value={draft.config.prompt.brandInitials}
                    onChange={(e) =>
                      patchConfig({
                        prompt: { ...draft.config.prompt, brandInitials: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Mood</span>
                  <input
                    className="input"
                    value={draft.config.prompt.moodName}
                    onChange={(e) =>
                      patchConfig({
                        prompt: { ...draft.config.prompt, moodName: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Brand swatches</span>
                  <SwatchEditor
                    colors={draft.config.prompt.swatches}
                    onChange={(swatches) =>
                      patchConfig({
                        prompt: {
                          ...draft.config.prompt,
                          swatches,
                        },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Trust label</span>
                  <input
                    className="input"
                    value={draft.config.trust.label}
                    onChange={(e) =>
                      patchConfig({
                        trust: { ...draft.config.trust, label: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <span className="label">Teams</span>
                  <TrustTeamsEditor
                    teams={draft.config.trust.teams}
                    onChange={(teams) =>
                      patchConfig({
                        trust: { ...draft.config.trust, teams },
                      })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
                Cards
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
                  gap: 16,
                }}
              >
                {[...draft.cards]
                  .sort((a, b) => a.slot - b.slot)
                  .map((card) => (
                    <CardEditor
                      key={card.slot}
                      card={card}
                      busy={busy === `card-${card.slot}`}
                      onPatch={(patch) => patchCard(card.slot, patch)}
                      onSave={(file) => void saveCard(card.slot, file)}
                    />
                  ))}
              </div>
            </div>

            <HeroPreview set={draft} />
          </main>
        </div>
      ) : null}
    </div>
  );
}

function CardEditor({
  card,
  busy,
  onPatch,
  onSave,
}: {
  card: LandingHeroSetCard;
  busy: boolean;
  onPatch: (patch: Partial<LandingHeroSetCard>) => void;
  onSave: (file?: File | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div
      className="card"
      style={{
        display: "grid",
        gap: 10,
        padding: 14,
        overflow: "hidden",
        alignContent: "start",
      }}
    >
      <div style={{ width: "min(240px, 100%)", margin: "0 auto" }}>
        <HeroCardImage card={{ ...card, rotation: 0 }} />
      </div>
      <label>
        <span className="label">Slot {card.slot} image</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <label>
        <span className="label">Headline</span>
        <textarea
          className="input"
          rows={2}
          value={card.headline}
          onChange={(e) => onPatch({ headline: e.target.value })}
        />
      </label>
      <label>
        <span className="label">Subcopy</span>
        <textarea
          className="input"
          rows={2}
          value={card.sub}
          onChange={(e) => onPatch({ sub: e.target.value })}
        />
      </label>
      <div style={{ display: "grid", gap: 8 }}>
        <SegmentedControl
          label="Text position"
          value={card.textPosition}
          options={[
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(value) => onPatch({ textPosition: value as "top" | "bottom" })}
        />
        <SegmentedControl
          label="Text color"
          value={card.textColor}
          options={[
            { value: "white", label: "White" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(value) => onPatch({ textColor: value as "white" | "dark" })}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          className="input"
          placeholder="Brand initials"
          value={card.brandInitials}
          onChange={(e) => onPatch({ brandInitials: e.target.value })}
        />
        <ColorField
          label="Brand badge"
          value={card.brandColor}
          onChange={(value) => onPatch({ brandColor: value })}
        />
      </div>
      <ColorField
        label="Brand text"
        value={card.brandTextColor}
        onChange={(value) => onPatch({ brandTextColor: value })}
      />
      <input
        className="input"
        placeholder="Badge text"
        value={card.badgeText ?? ""}
        onChange={(e) => onPatch({ badgeText: e.target.value })}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <ColorField
          label="Badge bg"
          value={card.badgeBg ?? ""}
          fallback="#7A4023"
          optional
          onChange={(value) => onPatch({ badgeBg: value })}
        />
        <ColorField
          label="Badge text"
          value={card.badgeColor ?? ""}
          fallback="#FBE5C2"
          optional
          onChange={(value) => onPatch({ badgeColor: value })}
        />
      </div>
      <button
        className="btn btn--primary"
        type="button"
        disabled={busy}
        onClick={() => onSave(file)}
      >
        {busy ? "Saving..." : "Save card"}
      </button>
    </div>
  );
}

function ColorField({
  label,
  value,
  fallback = "#111827",
  optional = false,
  onChange,
}: {
  label: string;
  value: string;
  fallback?: string;
  optional?: boolean;
  onChange: (value: string) => void;
}) {
  const current = colorValue(value, fallback);
  return (
    <div>
      <span className="label">{label}</span>
      <div
        style={{
          height: 36,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 8px 4px 4px",
          borderRadius: 8,
          background: "var(--cal-white)",
          boxShadow: "var(--shadow-ring)",
        }}
      >
        <input
          type="color"
          value={current}
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: 42,
            height: 28,
            padding: 0,
            border: 0,
            borderRadius: 6,
            background: "transparent",
            cursor: "pointer",
          }}
          aria-label={label}
        />
        <span style={{ color: "var(--fg-3)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
          {value || "none"}
        </span>
        {optional && value ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: "auto" }}
            onClick={() => onChange("")}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SwatchEditor({
  colors,
  onChange,
}: {
  colors: string[];
  onChange: (colors: string[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {colors.map((color, index) => (
        <div key={`${index}-${color}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="color"
            value={colorValue(color)}
            onChange={(event) =>
              onChange(
                colors.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
              )
            }
            style={{ width: 36, height: 32, padding: 0, border: 0, background: "transparent" }}
            aria-label={`Swatch ${index + 1}`}
          />
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => onChange(colors.filter((_, itemIndex) => itemIndex !== index))}
            aria-label="Remove swatch"
          >
            <I.Trash size={13} />
          </button>
        </div>
      ))}
      {colors.length < 6 ? (
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => onChange([...colors, "#111827"])}
        >
          <I.Plus size={13} />
          Swatch
        </button>
      ) : null}
    </div>
  );
}

function TrustTeamsEditor({
  teams,
  onChange,
}: {
  teams: Array<{ name: string; color: string }>;
  onChange: (teams: Array<{ name: string; color: string }>) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {teams.map((team, index) => (
        <div
          key={`${index}-${team.name}`}
          style={{ display: "grid", gridTemplateColumns: "1fr 44px 32px", gap: 8 }}
        >
          <input
            className="input"
            value={team.name}
            onChange={(event) =>
              onChange(
                teams.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, name: event.target.value } : item,
                ),
              )
            }
          />
          <input
            type="color"
            value={colorValue(team.color, "#111827")}
            onChange={(event) =>
              onChange(
                teams.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, color: event.target.value } : item,
                ),
              )
            }
            style={{ width: 44, height: 36, padding: 0, border: 0, background: "transparent" }}
            aria-label={`${team.name || "Team"} color`}
          />
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => onChange(teams.filter((_, itemIndex) => itemIndex !== index))}
            aria-label="Remove team"
          >
            <I.Trash size={13} />
          </button>
        </div>
      ))}
      {teams.length < 8 ? (
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          style={{ width: "max-content" }}
          onClick={() => onChange([...teams, { name: "NEW TEAM", color: "#111827" }])}
        >
          <I.Plus size={13} />
          Team
        </button>
      ) : null}
    </div>
  );
}

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
          gap: 4,
          padding: 4,
          borderRadius: 8,
          background: "var(--cal-gray-100)",
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              height: 28,
              border: 0,
              borderRadius: 6,
              background: option.value === value ? "var(--cal-white)" : "transparent",
              color: option.value === value ? "var(--fg-1)" : "var(--fg-3)",
              boxShadow: option.value === value ? "var(--shadow-ring)" : "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HeroPreview({ set }: { set: LandingHeroSetView }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
        Preview data
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 420px", gap: 20 }}>
        <div>
          <h3 style={{ margin: 0, color: "#071230", fontSize: 36, lineHeight: 1.05 }}>
            {set.config.headline.line1}
            <br />
            {set.config.headline.line2Prefix} {set.config.headline.line2Middle}{" "}
            {set.config.headline.line2Suffix}
          </h3>
          <p style={{ color: "var(--fg-2)", maxWidth: 560 }}>{set.config.lede}</p>
          <div className="lt-home-prompt-card" style={{ width: "100%", marginTop: 20 }}>
            <div className="lt-home-brief">
              <span>Brief</span>
              <p>{set.config.prompt.brief}</p>
            </div>
            <div className="lt-home-brand">
              <span>Brand</span>
              <div className="lt-home-brand-row">
                <div className="lt-home-brand-badge">{set.config.prompt.brandInitials}</div>
                <strong>{set.config.prompt.brandName}</strong>
                <div className="lt-home-swatches">
                  {set.config.prompt.swatches.map((swatch) => (
                    <i key={swatch} style={{ background: swatch }} />
                  ))}
                </div>
              </div>
              <span>Mood</span>
              <div className="lt-home-mood">
                <div>
                  <I.Snowflake size={12} strokeWidth={2.2} />
                </div>
                <strong>{set.config.prompt.moodName}</strong>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[...set.cards]
            .sort((a, b) => a.slot - b.slot)
            .map((card) => (
              <HeroCardImage key={card.slot} card={{ ...card, rotation: 0 }} />
            ))}
        </div>
      </div>
    </div>
  );
}
