import { notFound, redirect } from "next/navigation";

const allowedSteps = new Set(["identify", "logo", "palette", "fonts", "voice", "references"]);

export default async function BrandOnboardingPage(props: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await props.params;

  if (!allowedSteps.has(step)) {
    notFound();
  }

  redirect(`/brands/new/${step}`);
}
