import React from "react";
import { Check } from "lucide-react";

import { PLANS, type PlanCode } from "@layertone/billing";

import { Eyebrow, PillButton, SectionHeading, Serif } from "./primitives";
import { Reveal } from "./reveal";

const PLAN_ORDER: PlanCode[] = ["free", "subscription", "payg"];
const POPULAR: PlanCode = "subscription";
const PLAN_FEATURES: Record<PlanCode, string[]> = {
  free: ["20 starter credits", "Standard model only", "No moods", "No saved projects"],
  subscription: ["1,000 credits / month", "Full Moods", "Premium models", "Saved projects"],
  payg: ["Buy credits anytime", "Credits never expire", "Full stock library", "Retention day slots"],
};
const PLAN_TAGLINES: Record<PlanCode, string> = {
  free: "Kick the tires on your own brand.",
  subscription: "For brands posting every week.",
  payg: "Top up when campaigns spike.",
};

export function Pricing({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section id="pricing" className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="text-center">
            <Eyebrow className="text-brand">Pricing</Eyebrow>
            <SectionHeading className="mx-auto mt-4">
              Pay for what you <Serif>generate.</Serif>
            </SectionHeading>
            <p className="mx-auto mt-4 max-w-xl text-ink-soft">
              Free to try, subscribe for monthly production, or buy non-expiring credits when you
              need them.
            </p>
          </div>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PLAN_ORDER.map((code, i) => {
            const plan = PLANS[code];
            const popular = code === POPULAR;
            return (
              <Reveal key={code} delay={0.1 * i}>
                <div
                  className={`relative flex h-full flex-col rounded-[32px] p-9 ${
                    popular
                      ? "bg-ink-deep text-white shadow-float"
                      : "bg-white text-ink shadow-card"
                  }`}
                >
                  {popular ? (
                    <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white shadow-pill-dark">
                      Most popular
                    </span>
                  ) : null}
                  <h3 className="font-display text-[22px]">{plan.name}</h3>
                  <p className={`mt-1 text-sm ${popular ? "text-white/60" : "text-ink-soft"}`}>
                    {PLAN_TAGLINES[code]}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="font-display text-5xl tracking-tight">${plan.price}</span>
                    {code === "subscription" ? (
                      <span className={popular ? "text-sm text-white/60" : "text-sm text-ink-soft"}>
                        /mo
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-7 flex-1 list-none space-y-3 p-0">
                    {PLAN_FEATURES[code].map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check
                          size={15}
                          strokeWidth={2.6}
                          className={`mt-0.5 shrink-0 ${popular ? "text-brand-300" : "text-brand"}`}
                        />
                        <span className={popular ? "text-white/85" : "text-ink-soft"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <PillButton
                      href={isAuthed ? "/billing" : "/sign-up"}
                      variant={popular ? "brand" : "light"}
                      className="w-full"
                    >
                      {code === "free" ? "Start free" : "Get started"}
                    </PillButton>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={0.25}>
          <p className="mt-10 text-center text-[13px] text-ink-soft/80">
            Subscription credits expire monthly · PAYG credits never expire · PAYG actions cost
            about 20% more
          </p>
        </Reveal>
      </div>
    </section>
  );
}
