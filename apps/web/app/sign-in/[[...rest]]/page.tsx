import { redirect } from "next/navigation";

import { ClerkCard } from "@/components/auth/clerk-card";
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
      <SignIn
        appearance={{
          elements: {
            rootBox: { width: "100%" },
            card: {
              boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 16,
              width: "100%",
            },
          },
        }}
      />
    </ClerkCard>
  );
}
