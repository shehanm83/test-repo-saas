import { NextResponse } from "next/server";

import { MoodApi } from "@layertone/api/mood";
import { loadConfig } from "@layertone/shared/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const aspectRatio = url.searchParams.get("aspectRatio");
  const payload = await new MoodApi(loadConfig()).listAvailable(
    aspectRatio ? { aspectRatio } : {},
  );
  return NextResponse.json(payload);
}
