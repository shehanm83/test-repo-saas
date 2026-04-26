import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (process.env.AUTH_MODE !== "clerk") {
    return NextResponse.next();
  }

  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/webhooks).*)"],
};
