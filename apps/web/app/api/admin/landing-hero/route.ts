import { NextResponse } from "next/server";

import { LandingHeroApi } from "@vyora/api/landing-hero";
import { AppError, loadConfig } from "@vyora/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";
import { createServerAdapters } from "@/lib/server/adapters";

const config = () => loadConfig();
const api = () => new LandingHeroApi(config(), createServerAdapters() as never);

export async function GET() {
  return NextResponse.json(await api().listAll());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing-file" }, { status: 400 });
    }

    const fields = {
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
      rotation: Number(formData.get("rotation") ?? 0),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      status: formData.get("status") ?? "draft",
    };

    const card = await api().create({
      fields,
      file: {
        bytes: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
      },
    });

    if (session.workspaceId) {
      await writeAdminAudit({
        workspaceId: session.workspaceId,
        actorUserId: session.userId,
        action: "admin.landing_hero.create",
        target: card.id,
      });
    }
    return NextResponse.json(card);
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.userMessage } },
        { status: e.httpStatus },
      );
    }
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
