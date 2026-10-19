import React from "react";

interface SectionLabelProps {
  title?: string;
  label?: string;
  number?: string | number;
  className?: string;
}

/**
 * Clean human section label:
 * Hanken Grotesk 600, 11-12px, letter-spacing 0.12em, without bracket counters.
 */
export default function SectionLabel({
  title,
  label,
  className = "",
}: SectionLabelProps) {
  const displayTitle = title ?? label ?? "";

  if (!displayTitle) return null;

  return (
    <div
      className={`inline-flex items-center text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A] ${className}`}
    >
      <span>{displayTitle}</span>
    </div>
  );
}
