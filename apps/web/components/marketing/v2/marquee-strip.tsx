import React from "react";
import Image from "next/image";

import { MARQUEE_ASSETS } from "./assets";
import { Marquee } from "./marquee";
import { Reveal } from "./reveal";

const TILTS = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1"];

export function MarqueeStrip() {
  return (
    <section className="bg-cream pb-20 pt-8 md:pb-28" aria-label="Examples of generated campaigns">
      <Reveal y={40}>
        <Marquee>
          {MARQUEE_ASSETS.map((asset, i) => (
            <figure
              key={asset.src}
              className={`relative mx-3 w-[220px] shrink-0 overflow-hidden rounded-2xl shadow-card transition-transform duration-300 hover:scale-[1.03] md:w-[320px] ${TILTS[i % TILTS.length]}`}
            >
              <Image
                src={asset.src}
                alt={asset.alt}
                width={1080}
                height={1350}
                priority={i < 4}
                className="h-auto w-full object-cover"
                sizes="(max-width: 768px) 220px, 320px"
              />
              <figcaption className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-ink backdrop-blur-sm">
                {asset.label}
              </figcaption>
            </figure>
          ))}
        </Marquee>
      </Reveal>
      <p className="mt-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-ink-soft/70">
        Every image on this page was generated with AI
      </p>
    </section>
  );
}
