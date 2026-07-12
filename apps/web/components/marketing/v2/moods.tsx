import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { LandingMood } from "./types";

import { Eyebrow, Serif } from "./primitives";
import { Parallax } from "./parallax";
import { Reveal } from "./reveal";

export function Moods({ moods, moodCount }: { moods: LandingMood[]; moodCount: number }) {
  if (moodCount === 0 || moods.length === 0) return null;
  return (
    <section id="moods" className="overflow-hidden bg-ink-deep px-6 py-24 text-white md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow className="!text-cream/60">Moods</Eyebrow>
              <h2 className="mt-4 max-w-xl font-display text-[34px] leading-[1.08] tracking-tight md:text-[46px] lg:text-[54px]">
                Seasonal flavor, without
                <br />
                abandoning your <Serif>brand.</Serif>
              </h2>
            </div>
            <p className="max-w-sm text-[15px] leading-relaxed text-white/60">
              Curated style packs blend with your brand on demand — tonally consistent, never
              costume-y.
            </p>
          </div>
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
          {moods.slice(0, 4).map((m, i) => {
            const colors = m.accentPalette.length > 0 ? m.accentPalette : ["#2A1F18"];
            return (
              <Reveal key={m.id} delay={0.08 * i}>
                <Parallax offset={i % 2 === 0 ? 16 : -16}>
                  <div
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl"
                    style={{
                      background:
                        colors.length > 1
                          ? `linear-gradient(135deg, ${colors.join(", ")})`
                          : colors[0],
                    }}
                  >
                    {m.previewImgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.previewImgUrl}
                        alt={m.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/70" />
                    <div className="absolute left-4 top-4 flex gap-1">
                      {colors.slice(0, 5).map((c) => (
                        <span
                          key={c}
                          className="h-3 w-3 rounded-full ring-[1.5px] ring-white"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-x-4 bottom-4">
                      <div className="font-display text-lg md:text-xl">{m.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-white/70">
                        {m.kind === "seasonal" ? "Seasonal" : "Evergreen"}
                      </div>
                    </div>
                  </div>
                </Parallax>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={0.2}>
          <div className="mt-12 text-center">
            <Link
              href="/moods"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-medium text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/15"
            >
              {moodCount === 1 ? "Browse 1 mood" : `Browse ${moodCount} moods`}
              <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
