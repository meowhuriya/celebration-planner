import type { EventInput, EventPlan } from "./schemas";
import {
  correctBudgetSum,
  calculateMilestoneDate,
  scaleTimelineMilestones,
  formatINR,
} from "./utils";
import { getFallbackPalette } from "./palette";

/**
 * Creates a high-quality, friendly fallback plan customized to user inputs
 * when AI generation encounters invalid JSON or errors after retry.
 */
export function generateFallbackPlan(input: EventInput): EventPlan {
  const {
    eventType,
    eventDate,
    totalBudget,
    guestCount,
    city,
    vibeOrTheme,
    cultureOrTradition,
  } = input;

  // 1. Proportional Budget Categories based on event type
  const rawBudget =
    eventType === "wedding"
      ? [
          {
            category: "Venue & Staging",
            amount: Math.round(totalBudget * 0.35),
            percentage: 35,
            notes: `Main celebration venue in ${city}`,
          },
          {
            category: "Catering & Beverages",
            amount: Math.round(totalBudget * 0.28),
            percentage: 28,
            notes: `Multi-course dining for ${guestCount} guests`,
          },
          {
            category: "Decor & Floral Design",
            amount: Math.round(totalBudget * 0.12),
            percentage: 12,
            notes: vibeOrTheme
              ? `Theme: ${vibeOrTheme}`
              : "Traditional floral & ambient lighting",
          },
          {
            category: "Photography & Cinematography",
            amount: Math.round(totalBudget * 0.1),
            percentage: 10,
            notes: "Full ceremony coverage and candidate shots",
          },
          {
            category: "Attire & Styling",
            amount: Math.round(totalBudget * 0.05),
            percentage: 5,
            notes: "Ceremony outfits and makeup artist",
          },
          {
            category: "Entertainment & Music",
            amount: Math.round(totalBudget * 0.05),
            percentage: 5,
            notes: "DJ, sound system and live performance",
          },
          {
            category: "Invitations & Favors",
            amount: Math.round(totalBudget * 0.03),
            percentage: 3,
            notes: `Return gifts for ${guestCount} guests`,
          },
          {
            category: "Contingency Fund",
            amount: Math.round(totalBudget * 0.02),
            percentage: 2,
            notes: "Emergency buffer for day-of adjustments",
          },
        ]
      : eventType === "birthday"
        ? [
            {
              category: "Venue Rental",
              amount: Math.round(totalBudget * 0.3),
              percentage: 30,
              notes: `Party venue in ${city}`,
            },
            {
              category: "Food & Refreshments",
              amount: Math.round(totalBudget * 0.32),
              percentage: 32,
              notes: `Buffet and cake for ${guestCount} guests`,
            },
            {
              category: "Theme Decor & Balloons",
              amount: Math.round(totalBudget * 0.15),
              percentage: 15,
              notes: vibeOrTheme || "Festive celebration decor",
            },
            {
              category: "Entertainment & Games",
              amount: Math.round(totalBudget * 0.1),
              percentage: 10,
              notes: "Host, magician/games facilitator",
            },
            {
              category: "Custom Cake & Desserts",
              amount: Math.round(totalBudget * 0.05),
              percentage: 5,
              notes: "Tiered cake and dessert table",
            },
            {
              category: "Return Gifts & Favors",
              amount: Math.round(totalBudget * 0.05),
              percentage: 5,
              notes: `Goodie bags for ${guestCount} attendees`,
            },
            {
              category: "Photography",
              amount: Math.round(totalBudget * 0.03),
              percentage: 3,
              notes: "Event highlights and portraits",
            },
          ]
        : [
            {
              category: "Venue & Permits",
              amount: Math.round(totalBudget * 0.3),
              percentage: 30,
              notes: `Community space in ${city}`,
            },
            {
              category: "Community Catering",
              amount: Math.round(totalBudget * 0.35),
              percentage: 35,
              notes: `Food arrangements for ${guestCount} people`,
            },
            {
              category: "Sound & Audio/Visual",
              amount: Math.round(totalBudget * 0.15),
              percentage: 15,
              notes: "PA system, mic setups, and projector",
            },
            {
              category: "Decorations & Signage",
              amount: Math.round(totalBudget * 0.1),
              percentage: 10,
              notes: "Stage banners, welcome boards, and lighting",
            },
            {
              category: "Logistics & Seating",
              amount: Math.round(totalBudget * 0.06),
              percentage: 6,
              notes: `Arrangements for ${guestCount} guests`,
            },
            {
              category: "Emergency Buffer",
              amount: Math.round(totalBudget * 0.04),
              percentage: 4,
              notes: "Contingency reserve",
            },
          ];

  // Guarantee exact sum equals total
  const budget = correctBudgetSum(rawBudget, totalBudget);

  // 2. Backward-calculated Milestones
  const timelineMilestones = [
    {
      title: "Define Budget & Finalize Guest List",
      days: 90,
      desc: `Confirmed target of ${guestCount} guests in ${city}`,
    },
    {
      title: "Book Primary Venue & Reserve Date",
      days: 75,
      desc: "Lock in deposit and secure timing slots",
    },
    {
      title: "Contract Main Caterer & Tasting",
      days: 60,
      desc: "Finalize dietary preferences and tasting menu",
    },
    {
      title: "Select Decorator & Confirm Theme",
      days: 45,
      desc: vibeOrTheme
        ? `Align on ${vibeOrTheme} mood board`
        : "Approve decor layout and colors",
    },
    {
      title: "Send Formal Invitations",
      days: 30,
      desc: "Dispatch digital/print invites and track RSVPs",
    },
    {
      title: "Vendor Coordination & Schedule Alignment",
      days: 14,
      desc: "Share day-of run sheet with all vendors",
    },
    {
      title: "Final Headcount & Floorplan Check",
      days: 7,
      desc: "Lock final guest counts with catering team",
    },
    {
      title: "Pack Event Kits & Final Check-in",
      days: 1,
      desc: "Collect outfits, accessories, permits, and emergency items",
    },
  ];

  const rawTimeline = timelineMilestones.map((m) => ({
    title: m.title,
    dueDate: calculateMilestoneDate(eventDate, m.days),
    daysBeforeEvent: m.days,
    description: m.desc,
    completed: false,
  }));
  const timeline = scaleTimelineMilestones(rawTimeline, eventDate);

  // 3. Vendor Checklist
  const vendorChecklist = [
    {
      vendorType: "Venue Coordinator",
      questionsToAsk: [
        "What is the maximum curfew and sound restriction?",
        "Are outside caterers and decorators allowed?",
        "What is the backup plan in case of weather issues?",
      ],
      estimatedCost: formatINR(Math.round(totalBudget * 0.3)),
      priority: "high" as const,
      checked: false,
    },
    {
      vendorType: "Catering Manager",
      questionsToAsk: [
        "Can you accommodate specific dietary restrictions and allergies?",
        "Do you provide live stations and service staff?",
        "What are your surplus food policies?",
      ],
      estimatedCost: formatINR(Math.round(totalBudget * 0.28)),
      priority: "high" as const,
      checked: false,
    },
    {
      vendorType: "Decor & Lighting Vendor",
      questionsToAsk: [
        "Will you provide a 3D mockup or fabric swatches?",
        "How much setup time is required before guest arrival?",
        "Does quote include teardown and cleanup?",
      ],
      estimatedCost: formatINR(Math.round(totalBudget * 0.12)),
      priority: "medium" as const,
      checked: false,
    },
    {
      vendorType: "Photographer / Videographer",
      questionsToAsk: [
        "How many photographers will be on-site?",
        "What is the turnaround time for teaser photos and full gallery?",
        "Do you bring backup cameras and lighting rigs?",
      ],
      estimatedCost: formatINR(Math.round(totalBudget * 0.1)),
      priority: "medium" as const,
      checked: false,
    },
    {
      vendorType: "DJ & Sound Engineer",
      questionsToAsk: [
        "Can we provide a custom playlist and 'do not play' list?",
        "Do you supply wireless microphones for announcements?",
        "What electrical backup (generator) do you require?",
      ],
      estimatedCost: formatINR(Math.round(totalBudget * 0.06)),
      priority: "low" as const,
      checked: false,
    },
  ];

  // 4. Personalized Ideas
  const ideas = {
    theme:
      vibeOrTheme ||
      (cultureOrTradition
        ? `${cultureOrTradition} Celebration`
        : `Classic Elegance in ${city}`),
    decor: [
      "Custom personalized welcome arch with fresh florals and ambient fairy lights",
      "Interactive photo booth wall themed around the celebration aesthetic",
      "Table centerpieces combining scented candles and regional blooms",
      "Custom branded directional signage and guest message boards",
    ],
    food: [
      "Signature welcome mocktails featuring local seasonal fruits",
      "Live interactive food counter with freshly prepared delicacies",
      "Grand banquet spread with diverse vegetarian and non-vegetarian selections",
      "Artisan dessert bar featuring traditional sweets and celebration cake",
    ],
    activities: [
      "Heartwarming welcome address and ceremonial opening",
      "Curated music playlist and interactive celebration dance or games",
      "Photo montage showcasing memorable highlights of the host/couple",
      "Heartfelt vote of thanks and distribution of return gifts",
    ],
    culturalNotes: cultureOrTradition
      ? `Honoring the traditions of ${cultureOrTradition} with dedicated ceremony time, authentic decor elements, and respectful custom rituals.`
      : `Tailored celebration taking inspiration from local culture in ${city} with hospitable dining and celebratory ceremonies.`,
  };

  // 5. Day-of Run Sheet
  const runSheet = [
    {
      time: "09:00 AM",
      activity: "Venue access opens; vendor load-in begins",
      owner: "Event Coordinator",
      notes: "Check power sources and staging",
    },
    {
      time: "11:00 AM",
      activity: "Floral, decor, and lighting setup completion",
      owner: "Decor Team",
      notes: "Verify color scheme and tables",
    },
    {
      time: "01:00 PM",
      activity: "Audio/Visual soundcheck and mic tests",
      owner: "AV Technician",
      notes: "Test background music",
    },
    {
      time: "03:00 PM",
      activity: "Catering setup and food warming stations active",
      owner: "Catering Lead",
      notes: "Beverage station ready",
    },
    {
      time: "04:30 PM",
      activity: "Hosts arrive; family briefing & portrait session",
      owner: "Lead Photographer",
      notes: "Pre-event photos",
    },
    {
      time: "05:30 PM",
      activity: "Guest arrival, welcome drinks, and background music",
      owner: "Hospitality Lead",
      notes: "Welcome desk check-in",
    },
    {
      time: "06:30 PM",
      activity: "Ceremonial opening and official welcome",
      owner: "Master of Ceremonies",
      notes: "Key speeches and toasts",
    },
    {
      time: "07:30 PM",
      activity: "Dinner buffet opens; social mixing",
      owner: "Catering Team",
      notes: "Keep stations replenished",
    },
    {
      time: "09:00 PM",
      activity: "Cake cutting / special celebration highlight",
      owner: "Event Host",
      notes: "Gather all guests",
    },
    {
      time: "10:00 PM",
      activity: "Vote of thanks, gift distribution, and guest farewell",
      owner: "Host Family",
      notes: "Favors handed out",
    },
    {
      time: "11:00 PM",
      activity: "Vendor teardown and venue handover",
      owner: "Event Coordinator",
      notes: "Final walkthrough",
    },
  ];

  return {
    palette: getFallbackPalette(input),
    budget,
    timeline,
    vendorChecklist,
    ideas,
    runSheet,
    isFallback: true,
    fallbackReason: "Built-in celebration template based on inputs",
  };
}
