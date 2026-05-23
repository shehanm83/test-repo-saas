import { NextResponse } from "next/server";

import { LandingHeroApi } from "@layertone/api/landing-hero";
import { loadConfig } from "@layertone/shared/config";
import { AppError } from "@layertone/shared/errors/app-error";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";
import { createServerAdapters } from "@/lib/server/adapters";

const config = () => loadConfig();
const api = () => new LandingHeroApi(config(), createServerAdapters() as never);

export async function GET() {
  return NextResponse.json(await api().listSets());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  try {
    const body = await request.json().catch(() => ({}));
    const set =
      typeof body.duplicateFrom === "string"
        ? await api().duplicateSet(body.duplicateFrom)
        : await api().createSet(body);

    if (session.workspaceId) {
      await writeAdminAudit({
        workspaceId: session.workspaceId,
        actorUserId: session.userId,
        action: "admin.landing_hero_set.create",
        target: set?.id ?? null,
      });
    }
    return NextResponse.json(set);
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
