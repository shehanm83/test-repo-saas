"use client";

import React, { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/** Subtle scroll parallax: shifts children vertically as the element crosses the viewport. */
export function Parallax({
  children,
  offset = 40,
  className = "",
}: {
  children: React.ReactNode;
  offset?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
