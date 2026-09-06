import React from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import type { LandingHeroSetCard, LandingHeroSetView } from "@layertone/shared/landing-hero";

import { Eyebrow, PillButton, Serif } from "./primitives";
import { Reveal } from "./reveal";

const CARD_TILTS = ["-rotate-2", "rotate-2", "rotate-1", "-rotate-1"];

function CampaignCard({ card, index }: { card: LandingHeroSetCard; index: number }) {
  const copyAtTop = card.textPosition === "top";
  const useLightCopy = card.textColor === "white";
  const gradient = copyAtTop
    ? useLightCopy
      ? "bg-gradient-to-b from-black/70 via-black/10 to-transparent"
      : "bg-gradient-to-b from-white/85 via-white/10 to-transparent"
    : useLightCopy
      ? "bg-gradient-to-t from-black/70 via-black/10 to-transparent"
      : "bg-gradient-to-t from-white/85 via-white/10 to-transparent";

  return (
    <Reveal delay={0.08 * index} className={index % 2 === 1 ? "md:mt-8" : ""}>
      <article
        className={`group relative aspect-[4/5] overflow-hidden rounded-2xl bg-white shadow-float transition-transform duration-500 hover:rotate-0 hover:scale-[1.02] ${CARD_TILTS[index]}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.imageUrl}
          alt={`${card.headline.replaceAll("\n", " ")} campaign visual`}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className={`pointer-events-none absolute inset-0 ${gradient}`} />

        {card.badgeText ? (
          <div
            className="absolute right-3 top-3 grid h-14 w-14 rotate-6 place-items-center rounded-full px-1 text-center font-mono text-[10px] font-semibold leading-tight shadow-card"
            style={{
              background: card.badgeBg ?? "#7A4023",
              color: card.badgeColor ?? "#FBE5C2",
              whiteSpace: "pre-line",
            }}
          >
            {card.badgeText}
          </div>
        ) : null}

        <div
          className={`absolute inset-x-4 ${copyAtTop ? "top-4" : "bottom-4"}`}
          style={{ color: useLightCopy ? "#FFFFFF" : "#171310" }}
        >
          <h3
            className="font-display text-xl leading-[1.05] tracking-tight md:text-2xl"
            style={{ whiteSpace: "pre-line" }}
          >
            {card.headline}
          </h3>
          {card.sub ? (
            <p
              className="mt-2 text-xs font-medium leading-snug opacity-80"
              style={{ whiteSpace: "pre-line" }}
            >
              {card.sub}
            </p>
          ) : null}
        </div>

        <div
          className={`absolute left-4 grid h-9 w-9 place-items-center rounded-lg font-mono text-[11px] font-bold shadow-card ${
            copyAtTop ? "bottom-4" : "top-4"
          }`}
          style={{
            background: card.brandColor,
            color: card.brandTextColor,
          }}
          aria-label={`Brand initials ${card.brandInitials}`}
        >
          {card.brandInitials}
        </div>
      </article>
    </Reveal>
  );
}

export function CampaignSpotlight({
  campaign,
  isAuthed,
}: {
  campaign: LandingHeroSetView;
  isAuthed: boolean;
}) {
  const { config } = campaign;
  const primaryHref = isAuthed ? "/generate" : config.primaryCta.href;
  const cards = [...campaign.cards].sort((a, b) => a.slot - b.slot).slice(0, 4);

  return (
    <section
      id="campaign-spotlight"
      className="overflow-hidden bg-cream px-6 py-24 md:py-32"
      aria-labelledby="campaign-spotlight-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div>
          <Reveal>
            <Eyebrow className="text-brand">Campaign spotlight · {campaign.name}</Eyebrow>
            <h2
              id="campaign-spotlight-heading"
              className="mt-4 font-display text-[38px] leading-[1.05] tracking-tight text-ink md:text-[52px] lg:text-[60px]"
            >
              {config.headline.line1}
              <br />
              {config.headline.line2Prefix} <Serif>{config.headline.line2Middle}</Serif>{" "}
              {config.headline.line2Suffix}
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
              {config.lede}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <PillButton href={primaryHref}>
                {isAuthed ? "Open Layertone" : config.primaryCta.label}
                <ArrowRight size={16} strokeWidth={2.2} />
              </PillButton>
              {config.secondaryCta.enabled ? (
                <PillButton href={config.secondaryCta.href} variant="light">
                  {config.secondaryCta.label}
                </PillButton>
              ) : null}
            </div>
          </Reveal>

          {config.proofItems.length > 0 ? (
            <Reveal delay={0.16}>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                {config.proofItems.map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                    <Check size={13} strokeWidth={2.6} className="text-brand" />
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>
          ) : null}

          <Reveal delay={0.22}>
            <div className="mt-9 rounded-[28px] border border-ink/8 bg-white p-5 shadow-card">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
                  <Sparkles size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <Eyebrow>Example brief</Eyebrow>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">
                    {config.prompt.brief.replace(/^"|"$/g, "")}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink/8 pt-4">
                <div
                  className="grid h-9 w-9 place-items-center rounded-lg font-mono text-[11px] font-bold text-white"
                  style={{ background: config.prompt.swatches[0] }}
                >
                  {config.prompt.brandInitials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{config.prompt.brandName}</div>
                  <div className="text-xs text-ink-soft">{config.prompt.moodName} mood</div>
                </div>
                <div className="ml-auto flex gap-1.5" aria-label="Campaign color palette">
                  {config.prompt.swatches.map((swatch) => (
                    <span
                      key={swatch}
                      className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ background: swatch }}
                      title={swatch}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {config.trust.teams.length > 0 ? (
            <Reveal delay={0.28}>
              <div className="mt-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft/60">
                  {config.trust.label}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {config.trust.teams.map((team) => (
                    <span
                      key={team.name}
                      className="font-display text-sm font-semibold tracking-wide"
                      style={{ color: team.color }}
                    >
                      {team.name}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ) : null}
        </div>

        <div className="relative">
          <div
            className="absolute -inset-16 -z-0 rounded-full bg-brand/8 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-5">
            {cards.map((card, index) => (
              <CampaignCard key={card.id} card={card} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
