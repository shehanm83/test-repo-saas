"use client";

import React, { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { MARQUEE_ASSETS } from "./assets";
import { PillButton, Serif } from "./primitives";
import { Reveal } from "./reveal";

/** Distance the cursor must travel before the next image drops. */
const SPAWN_DISTANCE = 62;
const TRAIL_LIFETIME_MS = 1100;
/** Hard cap on simultaneously visible images. */
const MAX_LIVE = 12;

/**
 * Interactive CTA: moving the pointer across the panel drops fading campaign
 * images along the cursor's path.
 *
 * Images are preloaded and animated with the Web Animations API rather than a
 * CSS transition — a transition started on a freshly appended node can be
 * collapsed into the initial style recalc, which made drops vanish instantly.
 */
export function CtaTrail({ isAuthed }: { isAuthed: boolean }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const assetIndex = useRef(0);
  const live = useRef<HTMLImageElement[]>([]);
  const reduced = useReducedMotion();

  // Warm the browser cache so the first drops paint immediately.
  useEffect(() => {
    if (reduced) return;
    for (const asset of MARQUEE_ASSETS) {
      const img = new window.Image();
      img.src = asset.src;
    }
  }, [reduced]);

  // Never leave orphaned nodes behind on unmount.
  useEffect(() => {
    const nodes = live.current;
    return () => {
      for (const node of nodes) node.remove();
      nodes.length = 0;
    };
  }, []);

  const drop = useCallback((x: number, y: number) => {
    const layer = layerRef.current;
    if (!layer) return;

    const asset = MARQUEE_ASSETS[assetIndex.current % MARQUEE_ASSETS.length]!;
    assetIndex.current += 1;

    const img = document.createElement("img");
    img.src = asset.src;
    img.alt = "";
    img.decoding = "async";
    img.className = "pointer-events-none absolute w-[140px] rounded-2xl shadow-card md:w-[180px]";
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    img.style.willChange = "transform, opacity";

    const rotate = Math.random() * 20 - 10;
    const base = `translate(-50%, -50%) rotate(${rotate}deg)`;

    layer.appendChild(img);
    live.current.push(img);

    // Retire the oldest drops if the pointer moves faster than they fade.
    while (live.current.length > MAX_LIVE) {
      live.current.shift()?.remove();
    }

    const remove = () => {
      img.remove();
      const i = live.current.indexOf(img);
      if (i !== -1) live.current.splice(i, 1);
    };

    if (typeof img.animate !== "function") {
      window.setTimeout(remove, TRAIL_LIFETIME_MS);
      return;
    }

    const animation = img.animate(
      [
        { opacity: 0, transform: `${base} scale(0.86)` },
        { opacity: 1, transform: `${base} scale(1)`, offset: 0.12 },
        { opacity: 0, transform: `${base} scale(0.82)` },
      ],
      { duration: TRAIL_LIFETIME_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    );
    animation.onfinish = remove;
    animation.oncancel = remove;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduced || e.pointerType === "touch") return;
      const layer = layerRef.current;
      if (!layer) return;

      const rect = layer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const last = lastPoint.current;

      if (!last) {
        lastPoint.current = { x, y };
        drop(x, y);
        return;
      }

      // Fill in the gap when a single move event covers several spawn steps,
      // so fast flicks leave a trail instead of one lonely image.
      let dx = x - last.x;
      let dy = y - last.y;
      let distance = Math.hypot(dx, dy);
      if (distance < SPAWN_DISTANCE) return;

      let cursor = last;
      let steps = 0;
      while (distance >= SPAWN_DISTANCE && steps < 4) {
        const nextX = cursor.x + (dx / distance) * SPAWN_DISTANCE;
        const nextY = cursor.y + (dy / distance) * SPAWN_DISTANCE;
        drop(nextX, nextY);
        cursor = { x: nextX, y: nextY };
        dx = x - cursor.x;
        dy = y - cursor.y;
        distance = Math.hypot(dx, dy);
        steps += 1;
      }
      lastPoint.current = cursor;
    },
    [drop, reduced],
  );

  const onPointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Start a fresh trail each time the pointer arrives.
    const layer = layerRef.current;
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    lastPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerLeave = useCallback(() => {
    lastPoint.current = null;
  }, []);

  return (
    <section className="bg-cream px-6 py-16 md:py-24">
      <Reveal>
        <div
          onPointerMove={onPointerMove}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-white px-6 py-28 text-center shadow-card md:py-44"
        >
          <div ref={layerRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="pointer-events-none relative z-10">
            <h2 className="font-display text-[40px] leading-[1.05] tracking-tight text-ink md:text-[64px] lg:text-[76px]">
              Make something
              <br />
              <Serif>beautiful.</Serif>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-ink-soft">
              Try it on your brand — it takes about 30 seconds and 0 dollars.
            </p>
            <div className="pointer-events-auto mt-9 flex justify-center">
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
