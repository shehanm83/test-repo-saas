"use client";

import React, { useCallback, useRef } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { MARQUEE_ASSETS } from "./assets";
import { PillButton, Serif } from "./primitives";
import { Reveal } from "./reveal";

const SPAWN_DISTANCE = 110;
const TRAIL_LIFETIME_MS = 900;

/**
 * Interactive CTA: moving the pointer across the panel spawns fading
 * campaign images at the cursor. Pure DOM (no re-renders per move).
 */
export function CtaTrail({ isAuthed }: { isAuthed: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const assetIndex = useRef(0);
  const reduced = useReducedMotion();

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduced || e.pointerType !== "mouse") return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const last = lastPoint.current;
      if (last && Math.hypot(x - last.x, y - last.y) < SPAWN_DISTANCE) return;
      lastPoint.current = { x, y };

      const asset = MARQUEE_ASSETS[assetIndex.current % MARQUEE_ASSETS.length]!;
      assetIndex.current += 1;

      const img = document.createElement("img");
      img.src = asset.src;
      img.alt = "";
      img.className =
        "pointer-events-none absolute w-[140px] rounded-xl shadow-card md:w-[180px]";
      img.style.left = `${x}px`;
      img.style.top = `${y}px`;
      const rotate = (Math.random() * 20 - 10).toFixed(1);
      img.style.transform = `translate(-50%, -50%) rotate(${rotate}deg) scale(1)`;
      img.style.transition = `opacity ${TRAIL_LIFETIME_MS}ms ease-out, transform ${TRAIL_LIFETIME_MS}ms ease-out`;
      container.appendChild(img);
      requestAnimationFrame(() => {
        img.style.opacity = "0";
        img.style.transform = `translate(-50%, -50%) rotate(${rotate}deg) scale(0.82)`;
      });
      window.setTimeout(() => img.remove(), TRAIL_LIFETIME_MS + 100);
    },
    [reduced],
  );

  return (
    <section className="bg-cream px-6 py-16 md:py-24">
      <Reveal>
        <div
          ref={containerRef}
          onPointerMove={onPointerMove}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-white px-6 py-28 text-center shadow-card md:py-44"
        >
          <div className="relative z-10">
            <h2 className="font-display text-[40px] leading-[1.05] tracking-tight text-ink md:text-[64px] lg:text-[76px]">
              Make something
              <br />
              <Serif>beautiful.</Serif>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-ink-soft">
              Try it on your brand — it takes about 30 seconds and 0 dollars.
            </p>
            <div className="mt-9 flex justify-center">
              <PillButton href={isAuthed ? "/generate" : "/sign-up"}>
                <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-white/15">
                  <Image src="/brand/logo.png" alt="" width={20} height={20} />
                </span>
                {isAuthed ? "Open Layertone" : "Start creating free"}
                <ArrowRight size={16} strokeWidth={2.2} />
              </PillButton>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
