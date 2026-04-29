import React from "react";

import { LandingHeroApi } from "@vyora/api/landing-hero";
import { loadConfig } from "@vyora/shared";

import { Landing } from "@/components/marketing/landing";
import {
  DEFAULT_HERO_CARDS,
  pickRandomHeroCards,
  type HeroCard,
} from "@/components/marketing/hero-cards";
import { getServerSession } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export const dynamic = "force-dynamic";

async function loadHeroCards(): Promise<HeroCard[]> {
  try {
    const api = new LandingHeroApi(loadConfig(), createServerAdapters() as never);
    const rows = await api.listPublished();
    if (rows.length === 0) return pickRandomHeroCards(DEFAULT_HERO_CARDS, 4);

    const withUrls = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        imageUrl: await api.signedImageUrl(r.s3Key, 3600),
        headline: r.headline,
        sub: r.sub,
        textPosition: r.textPosition,
        textColor: r.textColor,
        brandInitials: r.brandInitials,
        brandColor: r.brandColor,
        brandTextColor: r.brandTextColor,
        badgeText: r.badgeText,
        badgeBg: r.badgeBg,
        badgeColor: r.badgeColor,
        rotation: r.rotation,
      })),
    );
    return pickRandomHeroCards(withUrls, 4);
  } catch {
    return pickRandomHeroCards(DEFAULT_HERO_CARDS, 4);
  }
}

export default async function HomePage() {
  const [session, heroCards] = await Promise.all([getServerSession(), loadHeroCards()]);
  return <Landing isAuthed={!!session} heroCards={heroCards} />;
}
