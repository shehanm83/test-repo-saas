import { redirect } from "next/navigation";

import { ClerkCard } from "@/components/auth/clerk-card";
import { loadConfig } from "@layertone/shared/config";

export default async function SignUpPage() {
  const config = loadConfig();

  if (config.auth.mode === "dev") {
    redirect("/brands/new/identify?new=1");
  }

  const { SignUp } = await import("@clerk/nextjs");

  return (
    <ClerkCard
      title="Create your Layertone account"
      subtitle="Free forever for one brand. No card required."
    >
      <SignUp
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
