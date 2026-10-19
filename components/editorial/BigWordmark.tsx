import React from "react";

interface BigWordmarkProps {
  text?: string;
  className?: string;
}

/**
 * Large sentence-case serif headline:
 * "Plan the day they'll remember."
 * clamp(48px, 8vw, 120px), line-height 1.05, italic emphasis on one word.
 */
export default function BigWordmark({
  text,
  className = "",
}: BigWordmarkProps) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <h1 className="font-serif text-[clamp(48px,8vw,120px)] font-normal leading-[1.05] tracking-tight text-[#2B1B14]">
        {text ? (
          text
        ) : (
          <>
            Plan the day they&apos;ll <span className="italic">remember</span>.
          </>
        )}
      </h1>
    </div>
  );
}
