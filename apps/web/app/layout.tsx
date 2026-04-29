import type { Metadata } from "next";
import React, { Suspense } from "react";

import { loadConfig } from "@vyora/shared";

import { NavProgress } from "@/components/nav-progress";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vyora.io"),
  title: "Vyora",
  description: "On-brand images, in a sentence. Create beyond imagination.",
  applicationName: "Vyora",
  icons: { icon: "/brand/logo.png" },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = loadConfig();
  const tree = (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;600&family=Fraunces:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );

  if (config.auth.mode === "clerk") {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return <ClerkProvider>{tree}</ClerkProvider>;
  }

  return tree;
}
