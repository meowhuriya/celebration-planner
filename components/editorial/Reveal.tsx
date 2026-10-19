"use client";

import React, { useRef, useState, useEffect } from "react";

interface RevealProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

export default function Reveal({
  children,
  delayMs = 0,
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (reduced || !("IntersectionObserver" in window)) {
      setRevealed(true);
      return;
    }

    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div
        className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          transform: revealed ? "translateY(0)" : "translateY(105%)",
          transitionDelay: `${delayMs}ms`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
