"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { Briefcase, Check, Loader2, RotateCw } from "lucide-react";

import { ColorSection } from "./color-section";
import { DangerZone } from "./danger-zone";
import { LogoSection } from "./logo-section";
import { ReferenceSection } from "./reference-section";
import { TypeSection } from "./type-section";
import { VoiceSection } from "./voice-section";
import { BrandRail } from "./brand-rail";
import { useBrandKit, type SaveStatus } from "./use-brand-kit";
import { draftFromBrand, emptyDraft, type BrandKitAsset, type BrandKitBrand } from "./types";

/**
 * One screen for creating and for editing a brand kit.
 *
 * The row is created as soon as the name is valid; everything after that
 * autosaves. There is no draft to lose, no step order, and no "which tab have I
 * saved" — the previous wizard's entire failure mode came from having all three.
 */
export function BrandKitForm(props: { brand?: BrandKitBrand; assets?: BrandKitAsset[] }) {
  const kit = useBrandKit({
    brandId: props.brand?.id ?? null,
    initialDraft: props.brand ? draftFromBrand(props.brand) : emptyDraft(),
    initialAssets: props.assets ?? [],
  });

  const { draft, assets, status, edit, commit, save } = kit;
  const logos = assets.filter((asset) => asset.kind === "logo");
  const references = assets.filter((asset) => asset.kind === "reference");
  const named = draft.name.trim().length > 0;

  useUnsavedGuard(status);

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <div className="mb-[7px] flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-brand">
            <Briefcase size={11} strokeWidth={2.4} />
            {kit.brandId ? "Brand kit" : "New brand"}
          </div>
          <h1 className="page__title">{draft.name.trim() || "New brand"}</h1>
          <p className="page__sub">
            Everything here is placed into your images exactly as you set it. Changes save
            themselves.
          </p>
        </div>
        <SaveBadge status={status} onRetry={() => void save()} />
      </div>

      <div className="grid items-start gap-[22px] min-[1180px]:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          <Section title="Identity" hint="What the brand is called, and what it sells.">
            <div className="grid gap-4 min-[700px]:grid-cols-2">
              <Field label="Brand name" required>
                <input
                  className="input w-full text-[13.5px]"
                  value={draft.name}
                  placeholder="Atlas Coffee"
                  aria-label="Brand name"
                  onChange={(event) => edit({ name: event.target.value })}
                  onBlur={() => {
                    if (named) void save();
                  }}
                />
              </Field>
              <Field label="Website" hint="optional">
                <input
                  className="input w-full text-[13.5px]"
                  type="url"
                  inputMode="url"
                  value={draft.sourceUrl}
                  placeholder="atlascoffee.com"
                  aria-label="Website"
                  onChange={(event) => edit({ sourceUrl: event.target.value })}
                  onBlur={() => {
                    if (named) void save();
                  }}
                />
              </Field>
            </div>
            <Field label="What you sell" hint="one line, used in every prompt">
              <input
                className="input w-full text-[13.5px]"
                maxLength={200}
                value={draft.descriptor}
                placeholder="Small-batch coffee roasted in Lisbon, sold online and in two cafés."
                aria-label="What you sell"
                onChange={(event) => edit({ descriptor: event.target.value })}
                onBlur={() => {
                  if (named) void save();
                }}
              />
            </Field>
          </Section>

          <Section
            title="Logos"
            hint="The renderer composites one logo per image — say which, and where it works."
          >
            <LogoSection
              logos={logos}
              busy={kit.busy !== null}
              progress={kit.uploadItems.filter((item) => item.kind === "logo")}
              onFiles={(files) => void kit.upload("logo", files)}
              onDescribe={(id, patch) => void kit.describeAsset(id, patch)}
              onRemove={(id) => void kit.removeAsset(id)}
            />
          </Section>

          <Section title="Colours" hint="Three to six. The first three do the most work.">
            <ColorSection
              palette={draft.palette}
              canExtract={false}
              extracting={false}
              onChange={(palette) => {
                const patch = {
                  palette,
                  paletteConfigured: palette.slice(0, 3).every(Boolean),
                };
                if (palette[0]) commit(patch);
                else edit(patch);
              }}
              onExtract={() => undefined}
            />
          </Section>

          <Section title="Typography" hint="Rendered into every image, so only fonts we can fetch.">
            <TypeSection
              fonts={draft.fonts}
              onChange={(fonts) => {
                const patch = {
                  fonts,
                  fontsConfigured: Boolean(fonts.heading.family && fonts.body.family),
                };
                if (patch.fontsConfigured) commit(patch);
                else edit(patch);
              }}
            />
          </Section>

          <Section title="Voice" hint="Used when we write captions and campaign copy.">
            <VoiceSection
              voiceNotes={draft.voiceNotes}
              tone={draft.tone}
              avoid={draft.avoid}
              example={draft.example}
              onEdit={edit}
              onCommit={commit}
              onBlur={() => {
                if (named) void save();
              }}
            />
          </Section>

          <Section
            title="References"
            hint="How your brand already looks. Grounds the AI background."
          >
            <ReferenceSection
              references={references}
              busy={kit.busy !== null}
              progress={kit.uploadItems.filter((item) => item.kind === "reference")}
              onFiles={(files) => void kit.upload("reference", files)}
              onRemove={(id) => void kit.removeAsset(id)}
            />
          </Section>

          {kit.brandId ? (
            <Section title="Danger zone">
              <DangerZone brandName={draft.name} onDelete={() => void kit.deleteBrand()} />
            </Section>
          ) : null}
        </div>

        <BrandRail
          draft={draft}
          assets={assets}
          {...(props.brand?.generationCount
            ? { generationCount: props.brand.generationCount }
            : {})}
        />
      </div>
    </div>
  );
}

function Section(props: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[17px] tracking-[-0.01em] text-ink">{props.title}</h2>
      {props.hint ? (
        <p className="mb-3.5 mt-1 text-[12.5px] text-ink-soft">{props.hint}</p>
      ) : (
        <div className="mb-3.5" />
      )}
      {props.children}
    </section>
  );
}

function Field(props: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="mt-3.5 block first:mt-0">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">
        {props.label}
        {props.hint ? <span className="normal-case tracking-normal"> — {props.hint}</span> : null}
        {props.required ? <span className="text-brand"> *</span> : null}
      </span>
      {props.children}
    </label>
  );
}

function SaveBadge(props: { status: SaveStatus; onRetry: () => void }) {
  const { status } = props;
  if (status.state === "clean") return null;

  if (status.state === "error") {
    return (
      <div
        className="flex items-center gap-2 rounded-full bg-[#fdf0ec] px-3 py-1.5 text-[12px] text-[#a8402c]"
        role="status"
      >
        <span>{status.message}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 font-medium underline"
          onClick={props.onRetry}
        >
          <RotateCw size={11} /> Retry
        </button>
      </div>
    );
  }

  if (status.state === "dirty") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] text-ink-soft shadow-card">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-soft/40" /> Unsaved
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] text-ink-soft shadow-card"
      role="status"
    >
      {status.state === "saving" ? (
        <>
          <Loader2 size={12} className="animate-spin" /> Saving…
        </>
      ) : (
        <>
          <Check size={12} className="text-brand" /> Saved
        </>
      )}
    </span>
  );
}

/** Warns if the tab closes mid-write. */
function useUnsavedGuard(status: SaveStatus) {
  const handler = useCallback(
    (event: BeforeUnloadEvent) => {
      if (status.state === "dirty" || status.state === "saving" || status.state === "error") {
        event.preventDefault();
      }
    },
    [status.state],
  );

  useEffect(() => {
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [handler]);
}
