import { redirect } from "next/navigation";

export default async function BrandOnboardingPage() {
  redirect("/brands/new");
}
