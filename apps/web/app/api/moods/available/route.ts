import { NextResponse } from "next/server";

import { billingSegmentFor } from "@layertone/billing";
import { MoodApi } from "@layertone/api/mood";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";

export async function GET(request: Request) {
  const { workspace } = await getSessionWorkspace();
  if (billingSegmentFor(workspace?.planCode) === "free") {
    return NextResponse.json([]);
  }

  const url = new URL(request.url);
  const aspectRatio = url.searchParams.get("aspectRatio");
  const payload = await new MoodApi(loadConfig()).listAvailable(
    aspectRatio ? { aspectRatio } : {},
  );
  return NextResponse.json(payload);
}
