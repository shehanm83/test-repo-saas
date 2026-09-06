import React from "react";
import { ArrowRight, Check } from "lucide-react";

import { HERO_VIDEO } from "./assets";
import { PillButton, Serif } from "./primitives";
import { Reveal } from "./reveal";

const PROOF = ["Free to try — no card", "On-brand every time", "Finished images in seconds"];

export function Hero({ isAuthed }: { isAuthed: boolean }) {
  const primaryHref = isAuthed ? "/generate" : "/sign-up";
  return (
    <section className="relative overflow-hidden bg-cream px-6 pb-10 pt-16 md:pt-24">
      <div id="hero-sentinel" className="absolute top-0 h-px w-px" aria-hidden="true" />
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-soft md:text-sm">
            AI creative studio for product brands
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-5 font-display text-[44px] leading-[1.05] tracking-tight text-ink md:text-[68px] lg:text-[76px]">
            Your products,
            <br />
            styled like a <Serif>campaign.</Serif>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
            Describe the post in a sentence. Layertone blends your logo, palette, and voice into
            finished, scroll-stopping social content — no designer, no waiting.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PillButton href={primaryHref}>
              {isAuthed ? "Open Layertone" : "Start creating free"}
              <ArrowRight size={16} strokeWidth={2.2} />
            </PillButton>
            <PillButton href="#showcase" variant="light">
              See it in action
            </PillButton>
          </div>
        </Reveal>
        <Reveal delay={0.32}>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {PROOF.map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                <Check size={13} strokeWidth={2.6} className="text-brand" />
                {item}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
      <Reveal delay={0.4} y={40}>
        <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-[28px] shadow-float md:mt-16">
          {HERO_VIDEO.hasVideo ? (
            <video
              className="aspect-video w-full object-cover"
              src={HERO_VIDEO.src}
              poster={HERO_VIDEO.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="A Layertone studio scene, generated with AI"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="aspect-video w-full object-cover"
              src={HERO_VIDEO.poster}
              alt="A Layertone studio scene, generated with AI"
            />
          )}
        </div>
      </Reveal>
    </section>
  );
}
