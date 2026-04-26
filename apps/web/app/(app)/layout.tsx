import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app/app-frame";
import { getServerSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AppLayout(props: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  return <AppFrame session={session}>{props.children}</AppFrame>;
}
