import { redirect } from "next/navigation";

import { ClerkCard } from "@/components/auth/clerk-card";
import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { loadConfig } from "@layertone/shared/config";

export default async function SignInPage() {
  const config = loadConfig();

  if (config.auth.mode === "dev") {
    redirect("/generate");
  }

  const { SignIn } = await import("@clerk/nextjs");

  return (
    <ClerkCard
      title="Welcome back"
      subtitle="Continue into Layertone and pick up where your last generation left off."
    >
      <SignIn appearance={clerkAppearance} />
    </ClerkCard>
  );
}
