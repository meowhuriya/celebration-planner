import React from "react";
import SectionLabel from "./SectionLabel";

interface BentoCardProps {
  title?: string;
  number?: string | number;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function BentoCard({
  title,
  number,
  headerAction,
  children,
  className = "",
}: BentoCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 sm:p-7 ${className}`}
    >
      {(title || headerAction) && (
        <div className="mb-5 flex items-center justify-between border-b border-[#E8DCC8]/80 pb-3">
          {title && <SectionLabel title={title} number={number} />}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
