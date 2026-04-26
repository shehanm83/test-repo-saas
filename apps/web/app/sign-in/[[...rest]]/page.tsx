import { redirect } from "next/navigation";

import { ClerkCard } from "@/components/auth/clerk-card";
import { loadConfig } from "@studio/shared";

export default async function SignInPage() {
  const config = loadConfig();

  if (config.auth.mode === "dev") {
    redirect("/generate");
  }

  const { SignIn } = await import("@clerk/nextjs");

  return (
    <ClerkCard
      title="Welcome back"
      subtitle="Continue into Studio and pick up where your last generation left off."
    >
      <SignIn
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
