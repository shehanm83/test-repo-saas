import React from "react";

import { createDb, listLandingHeroCardsPublished } from "@vyora/db";
import { loadConfig } from "@vyora/shared/config";
import { S3StorageAdapter } from "@vyora/storage";

import { Landing } from "@/components/marketing/landing";
import {
  DEFAULT_HERO_CARDS,
  pickRandomHeroCards,
  type HeroCard,
} from "@/components/marketing/hero-cards";
import { getServerSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

async function loadHeroCards(): Promise<HeroCard[]> {
  try {
    const config = loadConfig();
    const rows = await listLandingHeroCardsPublished(createDb(config.db.url, "app_admin"));
    if (rows.length === 0) return pickRandomHeroCards(DEFAULT_HERO_CARDS, 4);
    const storage = new S3StorageAdapter({
      region: config.storage.region,
      bucket: config.storage.bucketApp,
      forcePathStyle: config.storage.mode === "minio",
      ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
      ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
      ...(config.storage.secretAccessKey
        ? { secretAccessKey: config.storage.secretAccessKey }
        : {}),
    });

    const withUrls = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        imageUrl: await storage.getSignedUrl(r.s3Key, 3600),
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
