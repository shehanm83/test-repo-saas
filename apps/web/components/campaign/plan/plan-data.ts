import type { Platform } from "@layertone/shared/output-targets";

import type { CampaignBriefForm } from "../types";

export type CampaignAssetKind = "image" | "video";
export type CampaignObjective = "" | "awareness" | "consideration" | "conversion";

export interface CampaignFormat {
  id: string;
  label: string;
  platform: Platform;
  kind: CampaignAssetKind;
  aspectRatio: string;
  durationSeconds?: number;
}

/** One card is one asset assigned to one relative campaign time slot. */
export interface CampaignDeliverable {
  id: string;
  title: string;
  objective: CampaignObjective;
  audience: string;
  message: string;
  callToAction: string;
  formatId: string;
  campaignSlot: number | null;
}

export interface CampaignPlan {
  version: number;
  deliverables: CampaignDeliverable[];
}

export const CAMPAIGN_FORMATS: CampaignFormat[] = [
  {
    id: "instagram_post_4_5",
    label: "Instagram post",
    platform: "instagram",
    kind: "image",
    aspectRatio: "4:5",
  },
  {
    id: "instagram_story_9_16",
    label: "Instagram story",
    platform: "instagram",
    kind: "image",
    aspectRatio: "9:16",
  },
  {
    id: "instagram_reel_9_16",
    label: "Instagram reel",
    platform: "instagram",
    kind: "video",
    aspectRatio: "9:16",
    durationSeconds: 8,
  },
  {
    id: "facebook_feed_4_5",
    label: "Facebook feed",
    platform: "facebook",
    kind: "image",
    aspectRatio: "4:5",
  },
  {
    id: "facebook_story_9_16",
    label: "Facebook story",
    platform: "facebook",
    kind: "image",
    aspectRatio: "9:16",
  },
  {
    id: "facebook_reel_9_16",
    label: "Facebook reel",
    platform: "facebook",
    kind: "video",
    aspectRatio: "9:16",
    durationSeconds: 8,
  },
  {
    id: "tiktok_video_9_16",
    label: "TikTok video",
    platform: "tiktok",
    kind: "video",
    aspectRatio: "9:16",
    durationSeconds: 12,
  },
  {
    id: "linkedin_feed_1_1",
    label: "LinkedIn feed",
    platform: "linkedin",
    kind: "image",
    aspectRatio: "1:1",
  },
  {
    id: "pinterest_pin_2_3",
    label: "Pinterest pin",
    platform: "pinterest",
    kind: "image",
    aspectRatio: "2:3",
  },
];

export function createEmptyCampaignPlan(_form: CampaignBriefForm): CampaignPlan {
  return { version: 3, deliverables: [] };
}

export function campaignFormat(formatId: string): CampaignFormat {
  return CAMPAIGN_FORMATS.find((format) => format.id === formatId) ?? CAMPAIGN_FORMATS[0]!;
}

export function deliverableReady(deliverable: CampaignDeliverable, slotCount: number): boolean {
  return Boolean(
    deliverable.title.trim() &&
    deliverable.objective &&
    deliverable.audience.trim() &&
    deliverable.message.trim() &&
    deliverable.campaignSlot !== null &&
    deliverable.campaignSlot >= 1 &&
    deliverable.campaignSlot <= slotCount,
  );
}
