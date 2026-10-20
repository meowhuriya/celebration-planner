"use client";

import type { EventInput, EventPlan, PlanSection } from "@/lib/schemas";
import BudgetSection from "./sections/BudgetSection";
import FloorPlanCard from "./sections/FloorPlanCard";
import AutoFloorPlan from "./sections/AutoFloorPlan";
import CardStudioSection from "./sections/CardStudioSection";
import TimelineSection from "./sections/TimelineSection";
import VendorChecklistSection from "./sections/VendorChecklistSection";
import IdeasSection from "./sections/IdeasSection";
import RunSheetSection from "./sections/RunSheetSection";
import BackupPlanSection from "./sections/BackupPlanSection";
import SectionWrapper from "./sections/SectionWrapper";

interface PlanDisplayProps {
  plan: EventPlan;
  eventInput: EventInput;
  onRegenerate: (section: PlanSection) => void;
  onPlanUpdate: (plan: EventPlan) => void;
  regeneratingSection: PlanSection | null;
  errorMessage?: string;
  onRetry?: () => void;
  onGuestCountChange?: (count: number) => void;
}

export default function PlanDisplay({
  plan,
  eventInput,
  onRegenerate,
  onPlanUpdate,
  regeneratingSection,
  errorMessage,
  onRetry,
  onGuestCountChange,
}: PlanDisplayProps) {
  return (
    <div className="space-y-8">
      {/* 1. Budget */}
      <SectionWrapper
        id="budget"
        title="Budget"
        emoji="💰"
        section="budget"
        onRegenerate={onRegenerate}
        isRegenerating={regeneratingSection === "budget"}
      >
        <BudgetSection
          categories={plan.budget}
          currency={eventInput.currency}
          totalBudget={eventInput.totalBudget}
          guestCount={eventInput.guestCount}
          onUpdate={(budget) => onPlanUpdate({ ...plan, budget })}
        />
      </SectionWrapper>

      {/* 2. Floor plan */}
      <div id="floor-plan" className="scroll-mt-28 sm:scroll-mt-32">
        <FloorPlanCard
          guestCount={eventInput.guestCount}
          eventType={eventInput.eventType}
        />
      </div>

      {/* 3. Seating */}
      <div id="seating" className="scroll-mt-28 sm:scroll-mt-32">
        <AutoFloorPlan
          guestCount={eventInput.guestCount}
          eventType={eventInput.eventType}
          eventInput={eventInput}
          onBudgetGuestCountChange={onGuestCountChange}
        />
      </div>

      {/* 3.5 Card studio */}
      <div id="card-studio" className="scroll-mt-28 sm:scroll-mt-32">
        <CardStudioSection eventInput={eventInput} plan={plan} />
      </div>

      {/* 4. Timeline */}
      <SectionWrapper
        id="timeline"
        title="Timeline"
        emoji="📅"
        section="timeline"
        onRegenerate={onRegenerate}
        isRegenerating={regeneratingSection === "timeline"}
      >
        <TimelineSection
          milestones={plan.timeline}
          eventDate={eventInput.eventDate}
          onUpdate={(timeline) => onPlanUpdate({ ...plan, timeline })}
        />
      </SectionWrapper>

      {/* 5. Vendors */}
      <SectionWrapper
        id="vendors"
        title="Vendors"
        emoji="📋"
        section="vendorChecklist"
        onRegenerate={onRegenerate}
        isRegenerating={regeneratingSection === "vendorChecklist"}
      >
        <VendorChecklistSection
          vendors={plan.vendorChecklist}
          onUpdate={(vendorChecklist) =>
            onPlanUpdate({ ...plan, vendorChecklist })
          }
        />
      </SectionWrapper>

      {/* 6. Ideas */}
      <SectionWrapper
        id="ideas"
        title="Ideas"
        emoji="💡"
        section="ideas"
        onRegenerate={onRegenerate}
        isRegenerating={regeneratingSection === "ideas"}
      >
        <IdeasSection
          ideas={plan.ideas}
          palette={plan.palette}
          guestCount={eventInput.guestCount}
          eventType={eventInput.eventType}
        />
      </SectionWrapper>

      {/* 7. Schedule */}
      <SectionWrapper
        id="schedule"
        title="Day-of schedule"
        emoji="⏱️"
        section="runSheet"
        onRegenerate={onRegenerate}
        isRegenerating={regeneratingSection === "runSheet"}
      >
        <RunSheetSection items={plan.runSheet} />
      </SectionWrapper>

      {/* 8. Backup plan */}
      <BackupPlanSection
        plan={plan}
        eventInput={eventInput}
        errorMessage={errorMessage}
        onRetry={onRetry}
      />
    </div>
  );
}
