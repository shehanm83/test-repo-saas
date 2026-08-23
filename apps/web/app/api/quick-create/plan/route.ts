import { NextResponse } from "next/server";

import { QuickCreatePlanner, rateLimit } from "@layertone/api";
import { createDb } from "@layertone/db";
import { AppError } from "@layertone/shared/errors/app-error";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: { message: "Choose a workspace first." } }, { status: 400 });
  }

  const config = loadConfig();
  try {
    await rateLimit(createDb(config.db.url, "app_admin"), `quick-plan:${session.userId}`, 30, 60);
    const planner = new QuickCreatePlanner(config, createServerAdapters() as never);
    return NextResponse.json(
      await planner.plan({ workspaceId: session.workspaceId, input: await request.json() }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.userMessage } },
        { status: error.httpStatus },
      );
    }
    return NextResponse.json(
      { error: { code: "quick_create.plan_failed", message: (error as Error).message } },
      { status: 400 },
    );
  }
}
