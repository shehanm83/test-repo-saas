import type { Metadata } from "next";
import React from "react";

import { loadConfig } from "@studio/shared";

import "./globals.css";

export const metadata: Metadata = {
  title: "Studio",
  description: "On-brand images, in a sentence.",
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
      <body>{children}</body>
    </html>
  );

  if (config.auth.mode === "clerk") {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return <ClerkProvider>{tree}</ClerkProvider>;
  }

  return tree;
}
