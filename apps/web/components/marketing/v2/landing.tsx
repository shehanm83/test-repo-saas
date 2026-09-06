import React from "react";

import type { HomeShowcaseView } from "@layertone/shared/home-showcase";
import type { LandingHeroSetView } from "@layertone/shared/landing-hero";

import type { LandingMood } from "./types";

import { CampaignSpotlight } from "./campaign-spotlight";
import { CtaTrail } from "./cta-trail";
import { FloatingNav } from "./floating-nav";
import { Footer } from "./footer";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { MarketingNav } from "./nav";
import { MarqueeStrip } from "./marquee-strip";
import { Moods } from "./moods";
import { Pricing } from "./pricing";
import { Showcase } from "./showcase";
import { Testimonials } from "./testimonials";

export function LandingV2({
  isAuthed = false,
  showcase,
  moods,
  moodCount,
  campaign,
}: {
  isAuthed?: boolean;
  showcase: HomeShowcaseView;
  moods: LandingMood[];
  moodCount: number;
  campaign?: LandingHeroSetView | null;
}) {
  return (
    <div className="min-h-screen scroll-smooth bg-cream font-sans text-ink antialiased">
      <MarketingNav isAuthed={isAuthed} />
      <main>
        <Hero isAuthed={isAuthed} />
        <MarqueeStrip />
        {campaign ? <CampaignSpotlight campaign={campaign} isAuthed={isAuthed} /> : null}
        <HowItWorks />
        <Moods moods={moods} moodCount={moodCount} />
        <Showcase showcase={showcase} />
        <Testimonials />
        <Pricing isAuthed={isAuthed} />
        <CtaTrail isAuthed={isAuthed} />
      </main>
      <Footer />
      <FloatingNav isAuthed={isAuthed} />
    </div>
  );
}
