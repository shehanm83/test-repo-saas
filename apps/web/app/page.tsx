import React from "react";

import styles from "./page.module.css";

import { CtaStrip } from "@/components/marketing/cta-strip";
import { Differentiator } from "@/components/marketing/differentiator";
import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MoodsSection } from "@/components/marketing/moods-section";
import { Pricing } from "@/components/marketing/pricing";
import { Showcase } from "@/components/marketing/showcase";
import { getServerSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession();

  return (
    <main className={styles.page}>
      <Header isAuthed={!!session} />
      <Hero isAuthed={!!session} />
      <MoodsSection />
      <HowItWorks />
      <Showcase />
      <Differentiator />
      <Pricing />
      <CtaStrip />
      <Footer />
    </main>
  );
}
