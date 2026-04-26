import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/shell";
import { getServerSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout(props: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    redirect("/generate");
  }

  return <AdminShell>{props.children}</AdminShell>;
}
