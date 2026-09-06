import React from "react";
import { Briefcase, Sparkles, Wand2 } from "lucide-react";

import { Eyebrow, SectionHeading, Serif } from "./primitives";
import { Reveal } from "./reveal";

const STEPS = [
  {
    n: "01",
    icon: Briefcase,
    title: "Set up your brand",
    body: "Upload a logo, paste your colors, pick fonts — about 30 seconds. Or paste your URL and we'll grab them for you.",
  },
  {
    n: "02",
    icon: Wand2,
    title: "Describe what you want",
    body: "One or two sentences. Optionally pick a seasonal Mood from the catalog to set the vibe.",
  },
  {
    n: "03",
    icon: Sparkles,
    title: "Click generate",
    body: "Get finished, brand-correct images in seconds. Download, edit text inline, regenerate the ones you don't love.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <Eyebrow className="text-brand">How it works</Eyebrow>
          <SectionHeading className="mt-4 max-w-2xl">
            Three steps. Two minutes.
            <br />A <Serif>thousand</Serif> finished images.
          </SectionHeading>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={0.1 * i}>
              <div className="group h-full rounded-[28px] bg-cream p-8 transition-shadow duration-300 hover:shadow-card">
                <div className="flex items-start justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-deep text-white shadow-pill-dark transition-transform duration-300 group-hover:-rotate-6">
                    <step.icon size={20} strokeWidth={1.8} />
                  </div>
                  <span className="font-serif text-4xl italic text-ink/20">{step.n}</span>
                </div>
                <h3 className="mt-6 font-display text-xl text-ink">{step.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
