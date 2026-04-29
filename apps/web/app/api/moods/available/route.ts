import { NextResponse } from "next/server";

import { MoodApi } from "@vyora/api/mood";
import { loadConfig } from "@vyora/shared";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const aspectRatio = url.searchParams.get("aspectRatio");
  const payload = await new MoodApi(loadConfig()).listAvailable(
    aspectRatio ? { aspectRatio } : {},
  );
  return NextResponse.json(payload);
}
