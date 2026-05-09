import { NextResponse } from "next/server";

import { GenerationEstimateApi } from "@vyora/api";
import { createDb, resolveSelection, ResolveSelectionError } from "@vyora/db";
import { loadConfig } from "@vyora/shared/config";
import { AppError } from "@vyora/shared/errors/app-error";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

// GET /api/generations/estimate
//
// Lightweight live-total endpoint for the Quick Create wizard. Reuses A's
// resolveSelection so the wizard total matches the actual submit price.
// Auth-free; the lookups expose no PII.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tier = url.searchParams.get("tier") ?? "standard";
  const strength = url.searchParams.get("strength") ?? undefined;
  const sizeBucket = (url.searchParams.get("sizeBucket") ?? "standard") as "standard" | "large";
  const hasInspiration = url.searchParams.get("hasInspiration") === "true";
  const selectedModelCodes = url.searchParams.getAll("modelCode");

  const db = createDb(loadConfig().db.url, "app_admin");
  try {
    const r = await resolveSelection(db, {
      tier,
      ...(strength ? { strength } : {}),
      ...(selectedModelCodes.length > 0 ? { selectedModelCodes } : {}),
      sizeBucket,
      hasInspirationFlag: hasInspiration,
    });
    return NextResponse.json({
      totalCredits: r.totalCredits,
      models: r.models.map((m) => ({
        modelCode: m.modelCode,
        displayName: m.displayName,
        credits: m.credits,
      })),
    });
  } catch (e) {
    if (e instanceof ResolveSelectionError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: { code: "internal", message: e instanceof Error ? e.message : String(e) } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  try {
    const api = new GenerationEstimateApi(loadConfig(), createServerAdapters() as never);
    const payload = await api.estimate({
      workspaceId: session.workspaceId,
      input: await request.json(),
    });
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.userMessage, requestId: crypto.randomUUID() } },
        { status: e.httpStatus },
      );
    }
    const typed = e as Error & { code?: string; httpStatus?: number };
    return NextResponse.json(
      {
        error: {
          code: typed.code ?? "generation.estimate_failed",
          message: typed.message,
          requestId: crypto.randomUUID(),
        },
      },
      { status: typed.httpStatus ?? 400 },
    );
  }
}
