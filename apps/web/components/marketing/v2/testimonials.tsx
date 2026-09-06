import React from "react";
import { Star } from "lucide-react";

import { Marquee } from "./marquee";
import { SectionHeading, Serif } from "./primitives";
import { Reveal } from "./reveal";

const TESTIMONIALS = [
  {
    quote:
      "We replaced a freelance designer and a week of back-and-forth with a sentence. Our engagement is up 40% since we switched.",
    name: "Maya Lindqvist",
    role: "Founder, Nordic Glow Skincare",
  },
  {
    quote:
      "The brand matching is scary good. Every image comes out in our colors, with our logo placed properly. It just looks like us.",
    name: "Daniel Okafor",
    role: "Marketing Lead, Brew & Co.",
  },
  {
    quote:
      "Seasonal moods are the killer feature. Our Christmas campaign took twenty minutes instead of two weeks.",
    name: "Sofia Marchetti",
    role: "Owner, Dolce Forno Bakery",
  },
  {
    quote:
      "I post daily now. Before Layertone I posted when I could afford a shoot — maybe once a month.",
    name: "Priya Raman",
    role: "Founder, Asha Wellness",
  },
  {
    quote:
      "Our whole product line got a visual refresh over one weekend. Customers keep asking who our new agency is.",
    name: "Tom Becker",
    role: "Co-founder, Ridge Supply Co.",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

export function Testimonials() {
  return (
    <section className="overflow-hidden bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading>
              What <Serif>brands</Serif> say
            </SectionHeading>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} className="fill-ink text-ink" />
                ))}
              </div>
              <span className="text-sm font-medium text-ink">Loved by 2,000+ brands</span>
            </div>
          </div>
        </Reveal>
      </div>
      <Reveal delay={0.15}>
        <div className="mt-12">
          <Marquee speed="slow">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.name}
                className="mx-3 flex w-[320px] shrink-0 flex-col justify-between rounded-[28px] bg-white p-8 shadow-card md:w-[400px]"
              >
                <p className="font-serif text-[17px] italic leading-relaxed text-ink">
                  “{t.quote}”
                </p>
                <footer className="mt-6 flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-100 font-display text-sm text-brand-700">
                    {initials(t.name)}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink">{t.name}</div>
                    <div className="text-xs text-ink-soft">{t.role}</div>
                  </div>
                </footer>
              </blockquote>
            ))}
          </Marquee>
        </div>
      </Reveal>
    </section>
  );
}
