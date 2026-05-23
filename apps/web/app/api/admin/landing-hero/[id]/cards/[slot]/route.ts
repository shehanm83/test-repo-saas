import { NextResponse } from "next/server";

import { LandingHeroApi } from "@layertone/api/landing-hero";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";
import { createServerAdapters } from "@/lib/server/adapters";

const api = () => new LandingHeroApi(loadConfig(), createServerAdapters() as never);

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; slot: string }> },
) {
  const { id, slot: rawSlot } = await ctx.params;
  const slot = Number(rawSlot);
  const { session } = await getSessionWorkspace();

  const contentType = request.headers.get("content-type") ?? "";
  let fields: Record<string, unknown>;
  let file: { bytes: Buffer; filename: string } | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const uploaded = formData.get("file");
    if (uploaded instanceof File && uploaded.size > 0) {
      file = {
        bytes: Buffer.from(await uploaded.arrayBuffer()),
        filename: uploaded.name,
      };
    }
    fields = {
      headline: formData.get("headline") ?? "",
      sub: formData.get("sub") ?? "",
      textPosition: formData.get("textPosition") ?? "bottom",
      textColor: formData.get("textColor") ?? "white",
      brandInitials: formData.get("brandInitials") ?? "NW",
      brandColor: formData.get("brandColor") ?? "#FFFFFF",
      brandTextColor: formData.get("brandTextColor") ?? "#2A1F18",
      badgeText: formData.get("badgeText") || null,
      badgeBg: formData.get("badgeBg") || null,
      badgeColor: formData.get("badgeColor") || null,
      imageUrl: formData.get("imageUrl") || null,
    };
  } else {
    fields = await request.json();
  }

  const set = await api().updateSetCard(id, slot, { fields, file });
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.landing_hero_set.card_update",
      target: id,
      payload: { slot },
    });
  }
  return NextResponse.json(set);
}
