"use client";

import { useEffect, useRef, useState } from "react";
import "@fontsource/tinos/400.css";
import "@fontsource/tinos/700.css";
import "@fontsource/noto-naskh-arabic/400.css";
import "@fontsource/noto-naskh-arabic/700.css";
import { BookStudio, type ViewName } from "@/lib/book/book-studio";
import type { BookConfig } from "@/lib/book/config";

/**
 * Thin React wrapper around the WebGL BookStudio (ported from Demo 1).
 * Loaded with next/dynamic so three.js never reaches other pages.
 * Config changes are coalesced to one apply per animation frame.
 */
export default function BookCanvas({
  cfg,
  view,
  onReady,
  onError,
}: {
  cfg: BookConfig;
  view: { name: ViewName; seq: number };
  onReady: () => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const studioRef = useRef<BookStudio | null>(null);
  const cfgRef = useRef(cfg);
  const cbRef = useRef({ onReady, onError });
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    cbRef.current = { onReady, onError };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let studio: BookStudio;
    try {
      studio = new BookStudio(container, {
        onReady: () => {
          if (studioRef.current !== studio) return;
          studio.reveal();
          setRevealed(true);
          cbRef.current.onReady();
        },
      });
    } catch {
      cbRef.current.onError();
      return;
    }
    studioRef.current = studio;
    void studio.applyConfig(cfgRef.current);
    return () => {
      studioRef.current = null;
      studio.dispose();
    };
  }, []);

  useEffect(() => {
    cfgRef.current = cfg;
    const id = requestAnimationFrame(() => {
      if (studioRef.current && cfgRef.current === cfg) void studioRef.current.applyConfig(cfg);
    });
    return () => cancelAnimationFrame(id);
  }, [cfg]);

  useEffect(() => {
    if (view.seq > 0) studioRef.current?.setView(view.name);
  }, [view]);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className="absolute inset-0 transition-opacity duration-700 ease-out [&>canvas]:!h-full [&>canvas]:!w-full"
      style={{ opacity: revealed ? 1 : 0 }}
    />
  );
}
