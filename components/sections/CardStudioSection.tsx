"use client";

import React from "react";
import SectionLabel from "@/components/editorial/SectionLabel";
import CardStudio from "@/components/studio/CardStudio";
import type { EventInput, EventPlan } from "@/lib/schemas";

interface CardStudioSectionProps {
  eventInput: EventInput;
  plan: EventPlan;
  className?: string;
}

export default function CardStudioSection({
  eventInput,
  plan,
  className = "",
}: CardStudioSectionProps) {
  return (
    <section
      id="card-studio"
      className={`scroll-mt-28 sm:scroll-mt-32 ${className}`}
      aria-label="Card studio designer"
    >
      <div className="mb-4">
        <SectionLabel label="Designer suite" />
        <h2 className="mt-1 font-serif text-2xl font-normal tracking-tight text-[#2B1B14] sm:text-3xl">
          Card <span className="italic">studio</span>
        </h2>
        <p className="mt-1 text-sm text-[#6B5848]">
          Design custom celebration stationery, banners, and digital cards with
          drag-and-drop ease. Export personalised high-DPI cards with individual
          RSVP QR codes for every guest.
        </p>
      </div>

      <CardStudio palette={plan.palette} eventInput={eventInput} />
    </section>
  );
}
