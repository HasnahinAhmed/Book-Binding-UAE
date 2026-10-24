"use client";

import { useEffect, useState } from "react";

/**
 * Mobile preview sizing helpers:
 * - isMobile: below the lg breakpoint (split layout starts at lg)
 * - keyboardOpen: the on-screen keyboard is covering a large part of the viewport
 */
export function useMobilePreview() {
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);

    const vv = window.visualViewport;
    const onVV = () => {
      if (!vv) return;
      setKeyboardOpen(mq.matches && vv.height < window.innerHeight * 0.75);
    };
    vv?.addEventListener("resize", onVV);
    return () => {
      mq.removeEventListener("change", update);
      vv?.removeEventListener("resize", onVV);
    };
  }, []);

  return { isMobile, keyboardOpen };
}
