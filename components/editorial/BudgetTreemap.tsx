"use client";

import { useMemo, useState, memo } from "react";
import type { BudgetCategory } from "@/lib/schemas";
import { calculateTreemap, type TreemapNode } from "@/lib/treemap";

interface BudgetTreemapProps {
  categories: BudgetCategory[];
  totalBudget?: number;
  className?: string;
}

function BudgetTreemapComponent({
  categories,
  className = "",
}: BudgetTreemapProps) {
  const [activeNode, setActiveNode] = useState<TreemapNode | null>(null);

  // Calculate layout coordinates using 1000x280 virtual canvas
  const WIDTH = 1000;
  const HEIGHT = 260;

  const nodes = useMemo(
    () => calculateTreemap(categories, WIDTH, HEIGHT),
    [categories]
  );

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-[#5A5A5A]">
        <span>Budget treemap allocation</span>
        <span>Sized by spend</span>
      </div>

      {/* Treemap Container with 400ms smooth transitions */}
      <div
        className="relative h-60 w-full overflow-hidden rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-1"
        role="region"
        aria-label="Budget visual treemap"
      >
        {nodes.map((node, index) => {
          const leftPercent = (node.x / WIDTH) * 100;
          const topPercent = (node.y / HEIGHT) * 100;
          const widthPercent = (node.width / WIDTH) * 100;
          const heightPercent = (node.height / HEIGHT) * 100;

          const isHovered = activeNode?.category === node.category;

          return (
            <div
              key={`${node.category}-${index}`}
              tabIndex={0}
              role="button"
              aria-label={`${node.category}: ${node.formattedAmount} (${node.percentage.toFixed(1)}%)`}
              onMouseEnter={() => setActiveNode(node)}
              onMouseLeave={() => setActiveNode(null)}
              onFocus={() => setActiveNode(node)}
              onBlur={() => setActiveNode(null)}
              className="group absolute cursor-pointer overflow-hidden rounded-lg border border-white/60 p-2.5 transition-all focus:outline-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[#5B1A2B]"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                background: node.colorVar,
                transition:
                  "left 400ms cubic-bezier(0.22, 1, 0.36, 1), top 400ms cubic-bezier(0.22, 1, 0.36, 1), width 400ms cubic-bezier(0.22, 1, 0.36, 1), height 400ms cubic-bezier(0.22, 1, 0.36, 1), transform 200ms ease",
                transform: isHovered ? "scale(1.01)" : "scale(1)",
                zIndex: isHovered ? 10 : 1,
              }}
            >
              {/* Normal display for regular/large blocks */}
              {!node.isSmall ? (
                <div className="flex h-full select-none flex-col justify-between">
                  <span
                    className="truncate text-xs font-semibold tracking-tight"
                    style={{ color: node.textColorVar }}
                  >
                    {node.category}
                  </span>
                  <div>
                    <span
                      className="block font-mono text-xs font-medium tracking-tight"
                      style={{ color: node.textColorVar }}
                    >
                      {node.formattedAmount}
                    </span>
                    <span
                      className="block text-[10px] font-semibold opacity-75"
                      style={{ color: node.textColorVar }}
                    >
                      {node.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ) : (
                /* Small blocks: label hidden by default, revealed on hover and focus */
                <div className="relative flex h-full select-none items-center justify-center">
                  <span
                    className="text-[10px] font-semibold opacity-60 transition-opacity group-hover:opacity-0 group-focus:opacity-0"
                    style={{ color: node.textColorVar }}
                  >
                    {node.percentage.toFixed(0)}%
                  </span>

                  {/* Revealed floating tooltip on hover/focus */}
                  <div
                    className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-center rounded-md bg-black/90 p-1.5 text-center text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100"
                    style={{ minWidth: "80px" }}
                  >
                    <span className="truncate text-[10px] font-semibold">
                      {node.category}
                    </span>
                    <span className="font-mono text-[9px] text-[#D9D9D9]">
                      {node.formattedAmount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const BudgetTreemap = memo(BudgetTreemapComponent);
export default BudgetTreemap;
