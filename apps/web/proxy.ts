import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import postgres from "postgres";

// Next 16 renamed `middleware.ts` → `proxy.ts`. Same lifecycle, runs on every
// request matched by `config.matcher`. We keep this file deliberately
// dependency-light — pulling in @vyora/auth or @vyora/db here forces the
// dev bundler to walk Clerk + Svix + drizzle on every request, which adds
// 50-100s per /admin call under Turbopack.

const ADMIN_PATH_RE = /^\/(admin|api\/admin)(\/|$)/;
const STAFF_REALM = 'Basic realm="vyora-admin", charset="UTF-8"';

// Constant-time-ish dummy when the username doesn't exist.
const DUMMY_HASH = "$2b$12$invalidinvalidinvalidiOS5jGRA4LRfUsj4jfNd80tLUu1tn8hG";

// Module-level singletons survive between requests in the Node runtime, so
// the postgres pool stays warm and the auth cache absorbs RSC prefetch
// thrash. `globalThis` storage so HMR doesn't blow them away.
type StaffIdentity = { id: string; username: string };
type Cached = { staff: StaffIdentity; expiresAt: number };
const G = globalThis as unknown as {
  __staffPg?: ReturnType<typeof postgres>;
  __staffCache?: Map<string, Cached>;
};
const TTL_MS = 5 * 60_000;
const CACHE_MAX = 64;

function getPg() {
  if (!G.__staffPg) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not set");
    G.__staffPg = postgres(url, { max: 2, idle_timeout: 30 });
  }
  return G.__staffPg;
}

function getCache() {
  if (!G.__staffCache) G.__staffCache = new Map();
  return G.__staffCache;
}

async function verifyStaff(authHeader: string | null): Promise<StaffIdentity | null> {
  if (!authHeader || !authHeader.startsWith("Basic ")) return null;

  // Cache key includes the full Basic payload so a password rotation
  // immediately invalidates (different base64 → different key).
  const cache = getCache();
  const cached = cache.get(authHeader);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.staff;
  if (cached) cache.delete(authHeader);

  let decoded: string;
  try {
    decoded = Buffer.from(authHeader.slice("Basic ".length).trim(), "base64").toString("utf8");
  } catch {
    return null;
  }
  const colon = decoded.indexOf(":");
  if (colon < 0) return null;
  const username = decoded.slice(0, colon);
  const password = decoded.slice(colon + 1);
  if (!username || !password) return null;

  const sql = getPg();
  const rows = await sql<{ id: string; username: string; password_hash: string }[]>`
    SELECT id, username, password_hash
    FROM staff_users
    WHERE username = ${username}
    LIMIT 1
  `;
  const row = rows[0];
  const hash = row?.password_hash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  if (!row || !ok) return null;

  const staff: StaffIdentity = { id: row.id, username: row.username };
  // Best-effort touch — don't await so the request returns fast.
  void sql`UPDATE staff_users SET last_login_at = now() WHERE id = ${row.id}`.catch(() => undefined);

  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(authHeader, { staff, expiresAt: now + TTL_MS });
  return staff;
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (ADMIN_PATH_RE.test(request.nextUrl.pathname)) {
    const staff = await verifyStaff(request.headers.get("authorization"));
    if (!staff) {
      return new Response(null, {
        status: 401,
        headers: {
          "WWW-Authenticate": STAFF_REALM,
          "Cache-Control": "no-store",
        },
      });
    }
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

// Next 16 proxy.ts always runs in Node runtime; the explicit `runtime`
// setting from the older middleware era is no longer allowed.
export const config = {
  matcher: ["/((?!_next|favicon.ico|api/webhooks).*)"],
};
