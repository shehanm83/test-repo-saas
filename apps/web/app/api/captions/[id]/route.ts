import { NextResponse } from "next/server";

import { captionJobs, createDb } from "@layertone/db";
import { eq } from "@layertone/db/operators";
import { loadConfig } from "@layertone/shared/config";

import { getServerSession } from "@/lib/auth/server";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  const [job] = await createDb(loadConfig().db.url, "app_admin")
    .select()
    .from(captionJobs)
    .where(eq(captionJobs.id, id))
    .limit(1);

  if (!job) {
    return NextResponse.json(null);
  }

  if (session.role !== "admin" && job.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(job);
}
