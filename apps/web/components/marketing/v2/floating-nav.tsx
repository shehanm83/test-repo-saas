"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { PillButton } from "./primitives";

/** Floating bottom pill that appears once the hero scrolls out of view. */
export function FloatingNav({ isAuthed }: { isAuthed: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("hero-sentinel");
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry!.isIntersecting), {
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-5 rounded-full bg-white/95 py-2 pl-6 pr-2 shadow-float backdrop-blur">
            <Link href="/" className="font-serif text-xl font-semibold italic text-ink">
              L
            </Link>
            <Link href="#how-it-works" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
              How it works
            </Link>
            <Link href="#pricing" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
              Pricing
            </Link>
            <PillButton href={isAuthed ? "/generate" : "/sign-up"} className="!px-5 !py-2 text-sm">
              {isAuthed ? "Open Layertone" : "Start free"}
            </PillButton>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
