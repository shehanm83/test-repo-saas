import React from "react";

import { createDb, eq, moods } from "@layertone/db";
import { HomeShowcaseApi } from "@layertone/api/home-showcase";
import { DEFAULT_HOME_SHOWCASE_VIEW } from "@layertone/shared/home-showcase";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { LandingV2 } from "@/components/marketing/v2/landing";
import type { LandingMood } from "@/components/marketing/v2/types";
import { getServerSession } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export const dynamic = "force-dynamic";

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

async function loadMoods(): Promise<{ total: number; preview: LandingMood[] }> {
  try {
    const config = loadConfig();
    const rows = await createDb(config.db.url, "app_user")
      .select()
      .from(moods)
      .where(eq(moods.status, "published"));
    const storage = new S3StorageAdapter({
      region: config.storage.region,
      bucket: config.storage.bucketGlobal,
      forcePathStyle: config.storage.mode === "minio",
      ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
      ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
      ...(config.storage.secretAccessKey
        ? { secretAccessKey: config.storage.secretAccessKey }
        : {}),
    });

    const selected = [...rows].sort((a, b) => {
      const score = seasonScore(a, new Date()) - seasonScore(b, new Date());
      return score !== 0 ? score : a.name.localeCompare(b.name);
    }).slice(0, 4);

    const preview = await Promise.all(
      selected.map(async (m) => ({
        id: m.id,
        name: m.name,
        kind: m.kind,
        accentPalette: m.accentPalette ?? [],
        previewImgUrl: m.previewS3Key
          ? await storage.getSignedUrl(m.previewS3Key, 3600).catch(() => null)
          : null,
      })),
    );
    return { total: rows.length, preview };
  } catch {
    return { total: 0, preview: [] };
  }
}

function seasonScore(
  mood: { kind: string; validFrom: Date | null; validTo: Date | null },
  now: Date,
) {
  if (mood.kind !== "seasonal") return Number.MAX_SAFE_INTEGER / 2;
  if (!mood.validFrom && !mood.validTo) return Number.MAX_SAFE_INTEGER / 3;

  const nowMs = now.getTime();
  const year = now.getUTCFullYear();
  const occurrences = [year, year + 1].map((candidateYear) => {
    const start = mood.validFrom
      ? dateWithYear(mood.validFrom, candidateYear)
      : new Date(nowMs);
    let end = mood.validTo ? dateWithYear(mood.validTo, candidateYear) : start;
    if (end < start) end = dateWithYear(mood.validTo!, candidateYear + 1);
    return { start, end };
  });

  const future = occurrences.filter(({ end }) => end.getTime() >= nowMs);
  if (future.length === 0) return Number.MAX_SAFE_INTEGER / 4;

  const active = future.find(({ start, end }) => start.getTime() <= nowMs && end.getTime() >= nowMs);
  if (active) return -1_000_000_000 + (active.end.getTime() - nowMs);
  return Math.min(...future.map(({ start }) => start.getTime() - nowMs));
}

function dateWithYear(date: Date, year: number) {
  return new Date(
    Date.UTC(
      year,
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export default async function HomePage() {
  const [session, showcase, moods] = await Promise.all([
    getServerSession(),
    loadHomeShowcase(),
    loadMoods(),
  ]);
  return (
    <LandingV2
      isAuthed={!!session}
      showcase={showcase}
      moods={moods.preview}
      moodCount={moods.total}
    />
  );
}
