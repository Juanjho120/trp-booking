"use client";

import { useEffect, useRef } from "react";

export function useAdminInitialFocusScroll({
  enabled = true,
  focusKey,
  getElement,
  onScrolled,
  scrollReadyKey,
}: Readonly<{
  enabled?: boolean;
  focusKey: string | null;
  getElement: () => HTMLElement | null | undefined;
  onScrolled?: () => void;
  scrollReadyKey?: string | number;
}>) {
  const scrolledFocusKeyRef = useRef<string | null>(null);
  const firstFrameRef = useRef<number | null>(null);
  const secondFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      !enabled ||
      !focusKey ||
      scrolledFocusKeyRef.current === focusKey ||
      typeof window === "undefined"
    ) {
      return;
    }

    const targetElement = getElement();

    if (!targetElement) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    firstFrameRef.current = window.requestAnimationFrame(() => {
      secondFrameRef.current = window.requestAnimationFrame(() => {
        firstFrameRef.current = null;
        secondFrameRef.current = null;

        const currentElement = getElement();

        if (!currentElement) {
          return;
        }

        currentElement.scrollIntoView({
          block: "start",
          behavior: reducedMotion ? "auto" : "smooth",
        });
        scrolledFocusKeyRef.current = focusKey;
        onScrolled?.();
      });
    });

    return () => {
      if (firstFrameRef.current !== null) {
        window.cancelAnimationFrame(firstFrameRef.current);
        firstFrameRef.current = null;
      }

      if (secondFrameRef.current !== null) {
        window.cancelAnimationFrame(secondFrameRef.current);
        secondFrameRef.current = null;
      }
    };
  }, [enabled, focusKey, getElement, onScrolled, scrollReadyKey]);
}
