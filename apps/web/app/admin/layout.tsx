import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/shell";
import { getServerSession } from "@/lib/auth/server";

// Audit fix #4: removed redundant `dynamic = "force-dynamic"` — the
// session call below uses next/headers which forces dynamic rendering
// implicitly. Removing the explicit marker unblocks PPR.

export default async function AdminLayout(props: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    redirect("/generate");
  }

  return <AdminShell>{props.children}</AdminShell>;
}
