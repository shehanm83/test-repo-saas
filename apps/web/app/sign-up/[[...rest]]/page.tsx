import { redirect } from "next/navigation";

import { ClerkCard } from "@/components/auth/clerk-card";
import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { loadConfig } from "@layertone/shared/config";

export default async function SignUpPage() {
  const config = loadConfig();

  if (config.auth.mode === "dev") {
    redirect("/brands/new/identify?new=1");
  }

  const { SignUp } = await import("@clerk/nextjs");

  return (
    <ClerkCard
      title="Create your account"
      subtitle="Free forever for one brand. No card required."
    >
      <SignUp appearance={clerkAppearance} />
    </ClerkCard>
  );
}
