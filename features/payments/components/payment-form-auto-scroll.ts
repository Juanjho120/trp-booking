"use client";

export function scrollPaymentFormIntoViewportCenter(
  element: HTMLElement | null,
): void {
  if (!element) {
    return;
  }

  window.requestAnimationFrame(() => {
    const rect = element.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    const centeredTop = absoluteTop - (window.innerHeight - rect.height) / 2;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      top: Math.max(centeredTop, 0),
    });
  });
}
