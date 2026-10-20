"use client";

import type { EventInput } from "@/lib/schemas";
import { EXAMPLE_SCENARIOS } from "@/lib/examples";
import SectionLabel from "./editorial/SectionLabel";

interface ExampleScenariosProps {
  onSelect: (input: EventInput) => void;
}

export default function ExampleScenarios({ onSelect }: ExampleScenariosProps) {
  return (
    <section id="examples" className="mb-12" aria-labelledby="examples-heading">
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel label="Examples" />
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848]">
          One-click starter plans
        </span>
      </div>

      <h3
        id="examples-heading"
        className="mb-6 font-serif text-2xl font-normal tracking-tight text-[#2B1B14] sm:text-3xl"
      >
        Start with an <span className="italic">example</span>
      </h3>

      <div className="grid gap-5 sm:grid-cols-3">
        {EXAMPLE_SCENARIOS.map((scenario) => (
          <button
            key={scenario.label}
            type="button"
            onClick={() => onSelect(scenario.input)}
            className="group relative flex flex-col justify-between rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 text-left transition-colors duration-200 hover:border-[#3A0F1C] hover:bg-[#3A0F1C] hover:text-[#FBF6EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B1A2B] focus-visible:ring-offset-2"
          >
            <div>
              <div className="mb-4 flex items-center justify-between text-xs text-[#6B5848] group-hover:text-[#E8DCC8]">
                <span className="text-2xl" aria-hidden="true">
                  {scenario.emoji}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                  {scenario.input.eventType}
                </span>
              </div>

              <h4 className="mb-2 font-serif text-2xl font-normal leading-tight text-[#2B1B14] group-hover:italic group-hover:text-[#FBF6EE]">
                {scenario.label}
              </h4>

              <p className="text-xs leading-relaxed text-[#6B5848] group-hover:text-[#E8DCC8]">
                {scenario.description}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#E8DCC8]/80 pt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848] group-hover:border-[#5B1A2B] group-hover:text-[#FBF6EE]">
              <span>Use example</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
