import { redirect } from "next/navigation";

import { ClerkCard } from "@/components/auth/clerk-card";
import { loadConfig } from "@vyora/shared";

export default async function SignUpPage() {
  const config = loadConfig();

  if (config.auth.mode === "dev") {
    redirect("/onboarding/brand/identify");
  }

  const { SignUp } = await import("@clerk/nextjs");

  return (
    <ClerkCard
      title="Create your Vyora account"
      subtitle="Free forever for one brand. No card required."
    >
      <SignUp
        appearance={{
          elements: {
            card: "shadow-none border-0 bg-transparent",
            rootBox: "w-full",
          },
        }}
      />
    </ClerkCard>
  );
}
