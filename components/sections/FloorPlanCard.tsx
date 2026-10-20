"use client";

import { memo } from "react";
import VenueDesigner from "./venue-designer/VenueDesigner";

interface FloorPlanCardProps {
  guestCount?: number;
  eventType?: string;
}

function FloorPlanCardComponent({
  guestCount = 80,
  eventType = "wedding",
}: FloorPlanCardProps) {
  return <VenueDesigner guestCount={guestCount} eventType={eventType} />;
}

const FloorPlanCard = memo(FloorPlanCardComponent);
export default FloorPlanCard;
