import type { EventInput } from "./schemas";

/**
 * Three example scenarios so judges can see a full result instantly.
 */

export const EXAMPLE_SCENARIOS: {
  label: string;
  emoji: string;
  description: string;
  input: EventInput;
}[] = [
  {
    label: "Royal Indian Wedding",
    emoji: "💍",
    description:
      "A grand wedding with Sangeet, Haldi & Nikah ceremonies in Hyderabad for 500 guests",
    input: {
      hostName: "Aisha & Rahul",
      eventType: "wedding",
      eventDate: "2027-02-15",
      city: "Hyderabad",
      guestCount: 500,
      totalBudget: 3000000,
      currency: "INR",
      vibeOrTheme: "Royal Mughal elegance with modern touches",
      cultureOrTradition: "Nikah, Sangeet, Mehndi, Haldi ceremonies",
      specialRequirements:
        "Separate seating arrangements for families, live qawwali performance, vegetarian and non-vegetarian buffet",
    },
  },
  {
    label: "Kids Birthday Bash",
    emoji: "🎂",
    description: "A fun superhero-themed birthday party in Mumbai for 50 kids",
    input: {
      hostName: "The Sharma Family",
      eventType: "birthday",
      eventDate: "2026-12-20",
      city: "Mumbai",
      guestCount: 50,
      totalBudget: 150000,
      currency: "INR",
      vibeOrTheme: "Superhero adventure park theme",
      cultureOrTradition: "",
      specialRequirements:
        "Nut-free food options, magic show, bounce house, return gifts for all kids",
    },
  },
  {
    label: "Diwali Community Meetup",
    emoji: "🪔",
    description:
      "A vibrant Diwali celebration for the community in Delhi with 200 attendees",
    input: {
      hostName: "Greenwood Community Club",
      eventType: "community",
      eventDate: "2026-11-15",
      city: "Delhi",
      guestCount: 200,
      totalBudget: 500000,
      currency: "INR",
      vibeOrTheme: "Traditional Diwali with rangoli and diyas",
      cultureOrTradition:
        "Diwali celebration with Lakshmi puja, lamp lighting ceremony",
      specialRequirements:
        "Eco-friendly decorations only, traditional sweets, cultural performances, accessible venue",
    },
  },
];
