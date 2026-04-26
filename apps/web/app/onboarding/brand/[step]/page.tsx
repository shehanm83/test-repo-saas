import { notFound } from "next/navigation";

import { BrandWizard } from "@/components/onboarding/brand-wizard";

const allowedSteps = new Set(["identify", "logo", "palette", "fonts", "voice", "references"]);

export default async function BrandOnboardingPage(props: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await props.params;

  if (!allowedSteps.has(step)) {
    notFound();
  }

  return (
    <BrandWizard
      step={step as "identify" | "logo" | "palette" | "fonts" | "voice" | "references"}
    />
  );
}

