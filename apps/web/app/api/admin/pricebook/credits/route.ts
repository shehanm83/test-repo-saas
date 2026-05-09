import { NextResponse } from "next/server";

import { PricebookApi } from "@vyora/api/pricebook";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

// PUT /api/admin/pricebook/credits — set the credits for one
// (modelCode, sizeBucket, hasInspirationFlag) cell. Body shape matches
// PricebookApi.setCredits validator.
export async function PUT(request: Request) {
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  let payload;
  try {
    payload = await new PricebookApi(loadConfig()).setCredits(body);
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 422 || e.status === 404) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw err;
  }
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.pricebook.set-credits",
      target: payload.id,
      payload,
    });
  }
  return NextResponse.json(payload);
}

// GET /api/admin/pricebook/credits?modelCode=… — current 4-cell pricing
// for one model, used to populate the model-detail page.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const modelCode = url.searchParams.get("modelCode");
  if (!modelCode) {
    return NextResponse.json({ error: "modelCode required" }, { status: 400 });
  }
  const rows = await new PricebookApi(loadConfig()).forModel(modelCode);
  return NextResponse.json(rows);
}
