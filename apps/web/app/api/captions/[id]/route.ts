import { NextResponse } from "next/server";

import { captionJobs, createDb } from "@vyora/db";
import { eq } from "@vyora/db/operators";
import { loadConfig } from "@vyora/shared";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const [job] = await createDb(loadConfig().db.url, "app_admin")
    .select()
    .from(captionJobs)
    .where(eq(captionJobs.id, id))
    .limit(1);

  return NextResponse.json(job ?? null);
}
