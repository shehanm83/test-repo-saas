import { notFound } from "next/navigation";

import { BrandWizard } from "@/components/onboarding/brand-wizard";

const allowedSteps = new Set(["identify", "logo", "palette", "fonts", "voice", "references"]);

export default async function NewBrandPage(props: {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ fresh?: string; new?: string }>;
}) {
  const { step } = await props.params;
  const searchParams = await props.searchParams;

  if (!allowedSteps.has(step)) {
    notFound();
  }

  return (
    <BrandWizard
      step={step as "identify" | "logo" | "palette" | "fonts" | "voice" | "references"}
      resetDraft={searchParams.fresh === "1" || searchParams.new === "1"}
    />
  );
}
