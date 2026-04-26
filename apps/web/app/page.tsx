import React from "react";

import { Landing } from "@/components/marketing/landing";
import { getServerSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession();
  return <Landing isAuthed={!!session} />;
}
