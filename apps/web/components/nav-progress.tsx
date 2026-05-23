"use client";

import { usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

/**
 * Top loading bar that animates whenever the user clicks a Link and the
 * destination hasn't compiled yet (dev) or hasn't fetched its data (prod).
 *
 * Strategy: intercept clicks on internal <a>/<Link> at capture time, start
 * the bar, and stop it once the pathname or search params change (= the new
 * route has rendered).
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKey = useRef(`${pathname}?${searchParams?.toString() ?? ""}`);

  // Stop the bar when navigation completes
  useEffect(() => {
    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    if (key !== lastKey.current && active) {
      setProgress(100);
      const t = setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 200);
      lastKey.current = key;
      return () => clearTimeout(t);
    }
    lastKey.current = key;
    return undefined;
  }, [pathname, searchParams, active]);

  // Listen for internal link clicks → start the bar
  useEffect(() => {
    function start() {
      setActive(true);
      setProgress(8);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p; // hold near end until route resolves
          const remaining = 90 - p;
          return p + Math.max(0.5, remaining * 0.06);
        });
      }, 200);
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const a = target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;
      // Only intercept same-origin internal navigations
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        a.target === "_blank" ||
        a.hasAttribute("download")
      ) {
        return;
      }
      // If the link points at the current pathname, no nav happens
      const url = new URL(href, window.location.origin);
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      start();
    }

    function onSubmit(e: SubmitEvent) {
      const form = e.target as HTMLFormElement | null;
      if (form?.method?.toLowerCase() === "get") start();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  // Stop interval when bar is no longer active
  useEffect(() => {
    if (!active && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, [active]);

  if (!active && progress === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background:
            "linear-gradient(90deg, var(--layertone-violet) 0%, #B5B4F2 100%)",
          boxShadow: "0 0 12px rgba(94,92,230,0.6)",
          transition:
            progress === 100
              ? "width 180ms ease-out, opacity 200ms 180ms"
              : "width 200ms ease-out",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
