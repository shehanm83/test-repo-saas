import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app/app-frame";
import { getServerSession } from "@/lib/auth/server";

// Audit fix #4: removed `export const dynamic = "force-dynamic"`. The
// getServerSession() call below uses next/headers which already opts this
// layout into dynamic rendering. The explicit marker was redundant and
// blocked Next's PPR from kicking in on statically-derivable child pages.

export default async function AppLayout(props: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  return <AppFrame session={session}>{props.children}</AppFrame>;
}
