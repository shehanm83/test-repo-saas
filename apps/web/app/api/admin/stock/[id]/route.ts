import { NextResponse } from "next/server";

import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";
import { writeAdminAudit } from "@/lib/server/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session } = await getSessionWorkspace();
  const api = new StockApi(loadConfig(), createServerAdapters() as never);
  await api.adminDelete(id);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.stock.delete",
      target: id,
      payload: {},
    });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session } = await getSessionWorkspace();
  const body = (await request.json()) as {
    label?: string;
    category?: "food-dietary" | "food-safety" | "cosmetics" | "manufacturing" | "wellness";
    tags?: string[];
  };
  const api = new StockApi(loadConfig(), createServerAdapters() as never);
  const updated = await api.adminUpdate(id, body);
  if (!updated) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.stock.update",
      target: id,
      payload: body,
    });
  }
  return NextResponse.json(updated);
}
