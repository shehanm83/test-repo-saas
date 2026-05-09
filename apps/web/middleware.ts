import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { createDb, verifyStaffBasicAuth } from "@/lib/auth/staff-runtime";

const ADMIN_PATH_RE = /^\/(admin|api\/admin)(\/|$)/;

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  // Admin surface (super-admin staff) — gated by HTTP Basic against the
  // staff_users table. Fully independent of Clerk; even Clerk being down
  // doesn't lock staff out, and a leaked customer JWT can't escalate.
  if (ADMIN_PATH_RE.test(request.nextUrl.pathname)) {
    const auth = request.headers.get("authorization");
    const db = createDb();
    const staff = await verifyStaffBasicAuth(db, auth);
    if (!staff) {
      return new Response(null, {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="vyora-admin", charset="UTF-8"',
          "Cache-Control": "no-store",
        },
      });
    }
    // Inject staff identity for downstream Server Components / route handlers.
    // getServerSession() reads these and synthesises an admin session.
    const downstream = new Headers(request.headers);
    downstream.set("x-staff-id", staff.id);
    downstream.set("x-staff-username", staff.username);
    return NextResponse.next({ request: { headers: downstream } });
  }

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
  // Node runtime so we can use bcryptjs + the existing pg driver inside the
  // staff verification path. Edge runtime can't load these.
  runtime: "nodejs",
};
