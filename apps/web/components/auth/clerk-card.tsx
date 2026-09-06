import type { ReactNode } from "react";
import React from "react";
import Image from "next/image";
import Link from "next/link";

import { LayertoneMark } from "@/components/brand/layertone-mark";
import { MARQUEE_ASSETS } from "@/components/marketing/v2/assets";
import { Serif } from "@/components/marketing/v2/primitives";

function AuthImageColumn({ assets, reverse }: { assets: typeof MARQUEE_ASSETS; reverse?: boolean }) {
  const animation = reverse ? "animate-marquee-y-reverse" : "animate-marquee-y";
  return (
    <div className="h-full overflow-hidden">
      <div className={`flex w-full flex-col ${animation} motion-reduce:[animation-play-state:paused]`}>
        {[0, 1].map((clone) => (
          <div key={clone} className="flex shrink-0 flex-col gap-4 pb-4" aria-hidden={clone === 1}>
            {assets.map((asset) => (
              <Image
                key={asset.src}
                src={asset.src}
                alt={clone === 0 ? asset.alt : ""}
                width={540}
                height={675}
                className="w-full rounded-2xl object-cover shadow-card"
                sizes="20vw"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClerkCard(props: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-cream font-sans text-ink lg:grid-cols-[1fr_minmax(0,44%)]">
      <div className="relative flex flex-col px-6 py-8 md:px-14">
        <Link href="/" className="flex items-center gap-2.5 self-start">
          <LayertoneMark size={44} />
          <span className="font-display text-lg tracking-tight">
            Layer<b>tone</b>
          </span>
        </Link>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-[34px] leading-[1.08] tracking-tight md:text-[40px]">
            {props.title.includes(" ") ? (
              <>
                {props.title.split(" ").slice(0, -1).join(" ")}{" "}
                <Serif>{props.title.split(" ").at(-1)}</Serif>
              </>
            ) : (
              props.title
            )}
          </h1>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            {props.subtitle}
          </p>
          <div className="mt-8">{props.children}</div>
        </div>
        <p className="font-mono text-xs text-ink-soft/70">© 2026 Layertone</p>
      </div>
      <aside className="relative hidden max-h-screen overflow-hidden bg-cream-deep p-4 lg:block" aria-hidden="true">
        <div className="grid h-full grid-cols-2 gap-4">
          <AuthImageColumn assets={MARQUEE_ASSETS.slice(0, 4)} />
          <AuthImageColumn assets={MARQUEE_ASSETS.slice(4, 8)} reverse />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-cream-deep to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cream-deep to-transparent" />
      </aside>
    </main>
  );
}
