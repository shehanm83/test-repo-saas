import { redirect } from "next/navigation";

/**
 * Campaign persistence is intentionally not implemented yet. Never substitute
 * a fixture for an unknown campaign id: return users to the real-data builder.
 */
export default function CampaignPage() {
  redirect("/campaigns/new");
}
