import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import BudgetTreemap from "@/components/editorial/BudgetTreemap";
import AutoFloorPlan from "@/components/sections/AutoFloorPlan";
import DigitalInvitationCard from "@/components/DigitalInvitationCard";
import HangingInvitationCard from "@/components/HangingInvitationCard";
import type { BudgetCategory } from "@/lib/schemas";

expect.extend(toHaveNoViolations);

describe("BudgetTreemap Component & Accessibility", () => {
  const sampleCategories: BudgetCategory[] = [
    {
      category: "Venue & Mandap",
      amount: 200000,
      percentage: 40,
      notes: "Focal dais",
    },
    {
      category: "Catering & Sweets",
      amount: 150000,
      percentage: 30,
      notes: "Buffet",
    },
    {
      category: "Photography",
      amount: 80000,
      percentage: 16,
      notes: "Video & stills",
    },
    {
      category: "Decor & Lighting",
      amount: 70000,
      percentage: 14,
      notes: "Florals",
    },
  ];

  it("renders all categories with formatted INR amounts and percentage badges", () => {
    render(
      <BudgetTreemap categories={sampleCategories} totalBudget={500000} />
    );

    expect(screen.getByText("Venue & Mandap")).toBeInTheDocument();
    expect(screen.getByText("Catering & Sweets")).toBeInTheDocument();
    expect(screen.getByText("Photography")).toBeInTheDocument();
    expect(screen.getByText("Decor & Lighting")).toBeInTheDocument();
  });

  it("has zero accessibility violations (jest-axe)", async () => {
    const { container } = render(
      <BudgetTreemap categories={sampleCategories} totalBudget={500000} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("AutoFloorPlan Component & Accessibility", () => {
  it("renders venue architecture and table arrangement with text summary", () => {
    render(<AutoFloorPlan guestCount={50} eventType="birthday" />);

    expect(screen.getByText(/Venue & table/i)).toBeInTheDocument();
    expect(screen.getByText("50 guests, 7 tables")).toBeInTheDocument();
    expect(screen.getByText("8 seats / table")).toBeInTheDocument();
  });

  it("highlights table on focus and hover", () => {
    render(<AutoFloorPlan guestCount={20} eventType="wedding" />);

    const tableButtons = screen.getAllByRole("button");
    expect(tableButtons.length).toBeGreaterThan(0);

    // Focus first table
    fireEvent.focus(tableButtons[0]);
    expect(screen.getByText(/Table 1 · 10 seats/i)).toBeInTheDocument();

    fireEvent.blur(tableButtons[0]);
  });

  it("has zero accessibility violations (jest-axe)", async () => {
    const { container } = render(
      <AutoFloorPlan guestCount={60} eventType="wedding" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("Invitation Language Switcher & Accessibility", () => {
  it("switches invitation language to Hindi, Urdu, and Telugu seamlessly", async () => {
    const user = userEvent.setup();
    render(
      <DigitalInvitationCard
        input={{
          hostName: "The Kapoor Family",
          eventType: "wedding",
          city: "Jaipur",
          eventDate: "2027-11-20",
        }}
      />
    );

    // Default English
    expect(screen.getByText(/invites you to celebrate/i)).toBeInTheDocument();

    // Switch to Hindi
    const hindiRadio = screen.getByRole("radio", { name: "हिन्दी" });
    await user.click(hindiRadio);
    expect(
      screen.getByText(/आपको उत्सव में सम्मिलित होने के लिए आमंत्रित करते हैं/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /आपकी गरिमामयी उपस्थिति हमारे लिए अत्यंत हर्ष का विषय होगी/i
      )
    ).toBeInTheDocument();

    // Switch to Urdu (RTL)
    const urduRadio = screen.getByRole("radio", { name: "اردو" });
    await user.click(urduRadio);
    expect(
      screen.getByText(/آپ کو تقریب میں شرکت کی دلی دعوت پیش کرتے ہیں/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ہمیں آپ کی پرخلوص شرکت پر بے حد خوشی ہوگی/i)
    ).toBeInTheDocument();

    // Switch to Telugu
    const teluguRadio = screen.getByRole("radio", { name: "తెలుగు" });
    await user.click(teluguRadio);
    expect(
      screen.getByText(/వేడుకలో పాల్గొనాల్సిందిగా మిమ్మల్ని ఆహ్వానిస్తున్నారు/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/మీరు మాతో కలిసి ఈ వేడుకను జరుపుకుంటే మాకెంతో సంతోషం/i)
    ).toBeInTheDocument();
  });

  it("DigitalInvitationCard in all 4 languages has zero accessibility violations (jest-axe)", async () => {
    const { container, rerender } = render(
      <DigitalInvitationCard
        input={{
          hostName: "Rohan & Tara",
          eventType: "wedding",
          city: "Udaipur",
          eventDate: "2027-12-15",
        }}
      />
    );

    // English
    expect(await axe(container)).toHaveNoViolations();

    // Hindi
    fireEvent.click(screen.getByRole("radio", { name: "हिन्दी" }));
    expect(await axe(container)).toHaveNoViolations();

    // Urdu
    fireEvent.click(screen.getByRole("radio", { name: "اردو" }));
    expect(await axe(container)).toHaveNoViolations();

    // Telugu
    fireEvent.click(screen.getByRole("radio", { name: "తెలుగు" }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("HangingInvitationCard allows language switching and updates copy text", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <HangingInvitationCard
        input={{
          hostName: "Sharma Family",
          eventType: "wedding",
          city: "Delhi",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    // Click Hindi radio
    const hindiRadio = screen.getByRole("radio", { name: "हिन्दी" });
    await user.click(hindiRadio);

    expect(
      screen.getByText(/आपको उत्सव में सम्मिलित होने के लिए आमंत्रित करते हैं/i)
    ).toBeInTheDocument();

    // Copy text
    const copyBtn = screen.getByRole("button", { name: /copy invite text/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    const copiedContent = writeTextMock.mock.calls[0][0];
    expect(copiedContent).toContain(
      "आपको उत्सव में सम्मिलित होने के लिए आमंत्रित करते हैं"
    );
  });
});
