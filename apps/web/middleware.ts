import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (process.env.AUTH_MODE !== "clerk") {
    return NextResponse.next();
  }

  const { clerkMiddleware } = await import("@clerk/nextjs/server");

  return clerkMiddleware(async (auth, req) => {
    const authObj = await auth();
    const token = await authObj.getToken();
    if (token) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("authorization", `Bearer ${token}`);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  })(request, event);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/webhooks).*)"],
};
