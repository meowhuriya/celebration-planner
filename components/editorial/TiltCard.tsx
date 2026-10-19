"use client";

import React, { useRef, useState, useEffect } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  maxTiltDeg?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function TiltCard({
  children,
  maxTiltDeg = 6,
  className = "",
  style = {},
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [transform, setTransform] = useState("");

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setEnabled(fine && !reduced);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalised between -1 and 1
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    // Tilt toward pointer (up to maxTiltDeg)
    const tiltX = -normY * maxTiltDeg;
    const tiltY = normX * maxTiltDeg;

    setTransform(
      `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`
    );
  };

  const handlePointerLeave = () => {
    if (!enabled) return;
    setTransform(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
    );
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`shadow-xs rounded-[14px] border border-[#E8DCC8] bg-[#FFFDF8] p-5 transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        ...style,
        transform: transform || undefined,
        transformStyle: enabled ? "preserve-3d" : undefined,
      }}
    >
      {children}
    </div>
  );
}
