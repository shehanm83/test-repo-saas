import React from "react";

import { HomeShowcaseApi } from "@layertone/api/home-showcase";
import { LandingHeroApi } from "@layertone/api/landing-hero";
import { DEFAULT_HOME_SHOWCASE_VIEW } from "@layertone/shared/home-showcase";
import { DEFAULT_LANDING_HERO_SET } from "@layertone/shared/landing-hero";
import { loadConfig } from "@layertone/shared/config";

import { Landing } from "@/components/marketing/landing";
import { getServerSession } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export const dynamic = "force-dynamic";

async function loadHeroSet() {
  try {
    const api = new LandingHeroApi(loadConfig(), createServerAdapters() as never);
    const published = await api.listPublishedSets();
    return api.pickSetForRequest(published) ?? DEFAULT_LANDING_HERO_SET;
  } catch {
    return DEFAULT_LANDING_HERO_SET;
  }
}

async function loadHomeShowcase() {
  try {
    const api = new HomeShowcaseApi(loadConfig(), createServerAdapters() as never);
    const showcase = await api.getHomeView();
    return {
      ...showcase,
      images: api.pickImagesForRequest(showcase.images, 5),
    };
  } catch {
    return DEFAULT_HOME_SHOWCASE_VIEW;
  }
}

export default async function HomePage() {
  const [session, hero, showcase] = await Promise.all([
    getServerSession(),
    loadHeroSet(),
    loadHomeShowcase(),
  ]);
  return <Landing isAuthed={!!session} hero={hero} showcase={showcase} />;
}
