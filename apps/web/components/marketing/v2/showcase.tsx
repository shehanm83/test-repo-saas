import React from "react";
import Image from "next/image";

import type { HomeShowcaseView } from "@layertone/shared/home-showcase";

import { SHOWCASE_ASSETS } from "./assets";
import { Eyebrow, SectionHeading } from "./primitives";
import { Reveal } from "./reveal";

export function Showcase({ showcase }: { showcase: HomeShowcaseView }) {
  const dbImages = showcase.images.filter((img) => Boolean(img.imageUrl));
  const useDb = dbImages.length >= 4;
  return (
    <section id="showcase" className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="text-center">
            <Eyebrow className="text-brand">{showcase.config.kicker}</Eyebrow>
            <SectionHeading className="mx-auto mt-4 max-w-2xl">
              {showcase.config.galleryHeading}
            </SectionHeading>
          </div>
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {useDb
            ? dbImages.slice(0, 4).map((image, i) => (
                <Reveal key={image.id} delay={0.08 * i} className={i % 2 === 1 ? "md:mt-10" : ""}>
                  <div className="group overflow-hidden rounded-2xl shadow-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.imageUrl}
                      alt=""
                      className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </Reveal>
              ))
            : SHOWCASE_ASSETS.map((asset, i) => (
                <Reveal key={asset.src} delay={0.08 * i} className={i % 2 === 1 ? "md:mt-10" : ""}>
                  <figure className="group relative overflow-hidden rounded-2xl shadow-card">
                    <Image
                      src={asset.src}
                      alt={asset.alt}
                      width={1600}
                      height={1200}
                      className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    <figcaption className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-ink backdrop-blur-sm">
                      {asset.label}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
        </div>
        {showcase.config.cards.length > 0 ? (
          <div className="mt-20">
            <Reveal>
              <SectionHeading className="mx-auto max-w-4xl text-center">
                {showcase.config.differentiatorHeading}
              </SectionHeading>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {showcase.config.cards.map((card, i) => (
                <Reveal key={card.eyebrow} delay={0.1 * i}>
                  <div className="h-full rounded-[28px] border border-ink/8 bg-white p-8">
                    <Eyebrow style={{ color: card.color }}>{card.eyebrow}</Eyebrow>
                    <h3 className="mt-3 font-display text-xl text-ink">{card.heading}</h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{card.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
