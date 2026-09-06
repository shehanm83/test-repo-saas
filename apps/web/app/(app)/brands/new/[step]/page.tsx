import { redirect } from "next/navigation";

/** The old six-step wizard collapsed into one screen; keep its links working. */
export default async function LegacyNewBrandStepPage() {
  redirect("/brands/new");
}
