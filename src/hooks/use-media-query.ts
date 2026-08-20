"use client";

import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query. Reports `false` during SSR and first paint, so the
 * server-rendered markup and the first client render agree.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** True below the `lg` breakpoint. */
export const useIsMobile = () => useMediaQuery("(max-width: 1023px)");
