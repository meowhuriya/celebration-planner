import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import {
  buildInviteText,
  getCardTheme,
  detectCulturalTint,
  formatInviteDate,
  formatEventHeadline,
  buildIcsCalendar,
  escapeIcsText,
  getCardStyleConfig,
  getGoogleMapsUrl,
  parseInviteDate,
} from "@/lib/invitation";
import DigitalInvitationCard from "@/components/DigitalInvitationCard";

expect.extend(toHaveNoViolations);

describe("buildInviteText", () => {
  it("uses friendly fallback when host name is empty or whitespace", () => {
    const textEmpty = buildInviteText({
      hostName: "",
      eventType: "wedding",
      city: "Hyderabad",
    });
    expect(textEmpty).toContain("You are warmly invited to celebrate");
    expect(textEmpty).toContain("WEDDING CELEBRATION");
    expect(textEmpty).toContain("We would love to have you with us.");

    const textWhitespace = buildInviteText({
      hostName: "   ",
      eventType: "birthday",
    });
    expect(textWhitespace).toContain("You are warmly invited to celebrate");
  });

  it("includes host name when provided", () => {
    const text = buildInviteText({
      hostName: "Aisha & Rahul",
      eventType: "wedding",
      city: "Hyderabad",
    });
    expect(text).toContain("Aisha & Rahul invites you to celebrate");
    expect(text).toContain("WEDDING CELEBRATION");
  });

  it("handles long text safely without error", () => {
    const longHost =
      "The Grand Royal Families of Hyderabad and Delhi & Friends";
    const longTheme =
      "Ultra luxurious gold and burgundy royal mughal setup with antique chandeliers".repeat(
        2
      );
    const text = buildInviteText({
      hostName: longHost,
      eventType: "wedding",
      vibeOrTheme: longTheme,
    });
    expect(text).toContain(longHost);
    expect(text).toContain(longTheme);
  });

  it("handles special characters and quotes without breaking", () => {
    const text = buildInviteText({
      hostName: 'Priya & Amit\'s "Big Family"',
      eventType: "community",
      city: "New Delhi & NCR <South>",
      cultureOrTradition: "Diwali & Lakshmi Puja & 108 Diyas",
    });
    expect(text).toContain('Priya & Amit\'s "Big Family"');
    expect(text).toContain("New Delhi & NCR <South>");
    expect(text).toContain("Diwali & Lakshmi Puja & 108 Diyas");
  });

  it("formats text distinctly for each event type", () => {
    const wedding = buildInviteText({ eventType: "wedding" });
    const birthday = buildInviteText({ eventType: "birthday" });
    const community = buildInviteText({ eventType: "community" });
    const other = buildInviteText({ eventType: "other" });

    expect(wedding).toContain("WEDDING CELEBRATION");
    expect(birthday).toContain("BIRTHDAY CELEBRATION");
    expect(community).toContain("COMMUNITY GATHERING");
    expect(other).toContain("SPECIAL CELEBRATION");
  });

  it("incorporates cultural traditions into headline and body", () => {
    const text = buildInviteText({
      hostName: "Farhan & Fatima",
      eventType: "wedding",
      cultureOrTradition: "Nikah Ceremony",
      city: "Lucknow",
    });
    expect(text).toContain("NIKAH CEREMONY & WEDDING CELEBRATION");
    expect(text).toContain("🪔 Traditions & Ceremonies: Nikah Ceremony");
  });

  it("formats date when a valid ISO date is provided", () => {
    const text = buildInviteText({
      eventDate: "2027-10-25",
      eventType: "birthday",
    });
    expect(text).toContain("2027");
    expect(text).toContain("October");
  });
});

describe("detectCulturalTint & getCardTheme", () => {
  it("detects Haldi tint and returns high-contrast theme", () => {
    expect(detectCulturalTint("Haldi and Mehndi ceremony")).toBe("haldi");
    const theme = getCardTheme("wedding", "Haldi and Mehndi ceremony");
    expect(theme.culturalTint).toBe("haldi");
    expect(theme.hostTextColor).toContain("text-amber-950");
  });

  it("detects Nikah tint and returns emerald theme", () => {
    expect(detectCulturalTint("Traditional Nikah ceremony")).toBe("nikah");
    const theme = getCardTheme("wedding", "Traditional Nikah ceremony");
    expect(theme.culturalTint).toBe("nikah");
    expect(theme.hostTextColor).toContain("text-emerald-950");
  });

  it("detects Sangeet tint and returns fuchsia theme", () => {
    expect(detectCulturalTint("Sangeet night with dance")).toBe("sangeet");
    const theme = getCardTheme("wedding", "Sangeet night with dance");
    expect(theme.culturalTint).toBe("sangeet");
    expect(theme.hostTextColor).toContain("text-fuchsia-950");
  });

  it("detects Diwali tint and returns warm festive theme", () => {
    expect(detectCulturalTint("Diwali celebration with lamps")).toBe("diwali");
    const theme = getCardTheme("community", "Diwali celebration with lamps");
    expect(theme.culturalTint).toBe("diwali");
  });

  it("falls back to default event type themes when culture has no match", () => {
    expect(detectCulturalTint("")).toBeNull();
    const weddingTheme = getCardTheme("wedding");
    expect(weddingTheme.variant).toBe("wedding");
    expect(weddingTheme.cardBorder).toContain("border-double");

    const birthdayTheme = getCardTheme("birthday");
    expect(birthdayTheme.variant).toBe("birthday");
    expect(birthdayTheme.cardBorder).toContain("border-dashed");

    const communityTheme = getCardTheme("community");
    expect(communityTheme.variant).toBe("community");
  });
});

describe("DigitalInvitationCard component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with host name when provided", () => {
    render(
      <DigitalInvitationCard
        input={{
          hostName: "Aisha & Rahul",
          eventType: "wedding",
          city: "Hyderabad",
          eventDate: "2027-11-20",
          vibeOrTheme: "Royal Mughal Elegance",
          cultureOrTradition: "Nikah & Sangeet",
        }}
      />
    );

    expect(
      screen.getByRole("region", { name: "Digital Invitation Card" })
    ).toBeInTheDocument();
    expect(screen.getByText("Aisha & Rahul")).toBeInTheDocument();
    expect(screen.getByText(/invites you to celebrate/i)).toBeInTheDocument();
    expect(screen.getByText("Hyderabad")).toBeInTheDocument();
    expect(screen.getByText("Nikah & Sangeet")).toBeInTheDocument();
    expect(screen.getByText("Royal Mughal Elegance")).toBeInTheDocument();
  });

  it("renders friendly fallback 'You Are Invited' when host name is empty", () => {
    render(
      <DigitalInvitationCard
        input={{
          hostName: "",
          eventType: "birthday",
          city: "Mumbai",
        }}
      />
    );

    expect(screen.getByText("You Are Invited")).toBeInTheDocument();
    expect(screen.getByText(/to join the celebration of/i)).toBeInTheDocument();
  });

  it("handles copy invite text action and updates aria-live", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <DigitalInvitationCard
        input={{
          hostName: "The Sharma Family",
          eventType: "birthday",
          city: "Mumbai",
        }}
      />
    );

    const copyBtn = screen.getByRole("button", {
      name: /copy invitation text/i,
    });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledOnce();
    expect(screen.getByText(/invite text copied/i)).toBeInTheDocument();
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("renders accessible WhatsApp share link with encoded URI", () => {
    render(
      <DigitalInvitationCard
        input={{
          hostName: "Greenwood Community Club",
          eventType: "community",
          city: "Delhi",
        }}
      />
    );

    const whatsappLink = screen.getByRole("link", {
      name: /share invitation on whatsapp/i,
    });
    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(whatsappLink).toHaveAttribute("rel", "noopener noreferrer");
    const href = whatsappLink.getAttribute("href") || "";
    expect(href).toContain("https://wa.me/?text=");
    expect(href).toContain("Greenwood%20Community%20Club");
  });

  it("triggers window.print when print button is clicked", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(
      <DigitalInvitationCard
        input={{
          hostName: "Aisha & Rahul",
          eventType: "wedding",
        }}
      />
    );

    const printBtn = screen.getByRole("button", {
      name: /print or save invitation card/i,
    });
    await user.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
  });

  it("has zero accessibility violations (jest-axe) for wedding", async () => {
    const { container } = render(
      <DigitalInvitationCard
        input={{
          hostName: "Aisha & Rahul",
          eventType: "wedding",
          city: "Hyderabad",
          eventDate: "2027-11-20",
          cultureOrTradition: "Nikah & Sangeet",
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has zero accessibility violations (jest-axe) for birthday", async () => {
    const { container } = render(
      <DigitalInvitationCard
        input={{
          hostName: "The Sharma Family",
          eventType: "birthday",
          city: "Mumbai",
          eventDate: "2027-08-15",
          vibeOrTheme: "Superhero Party",
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has zero accessibility violations (jest-axe) for community Diwali", async () => {
    const { container } = render(
      <DigitalInvitationCard
        input={{
          hostName: "Greenwood Club",
          eventType: "community",
          city: "Delhi",
          eventDate: "2027-11-01",
          cultureOrTradition: "Diwali Puja",
        }}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders venue name, dress code, calendar button, and maps link", () => {
    render(
      <DigitalInvitationCard
        input={{
          hostName: "Aisha & Rahul",
          eventType: "wedding",
          city: "Hyderabad",
          venueName: "Taj Falaknuma Palace",
          dressCode: "Traditional Silk",
          eventDate: "2027-11-20",
        }}
      />
    );

    expect(screen.getByText("Taj Falaknuma Palace")).toBeInTheDocument();
    expect(screen.getByText("Traditional Silk")).toBeInTheDocument();

    const calBtn = screen.getByRole("button", {
      name: /save to calendar/i,
    });
    expect(calBtn).toBeInTheDocument();

    const mapLink = screen.getByRole("link", {
      name: /open map/i,
    });
    expect(mapLink).toHaveAttribute("target", "_blank");
    expect(mapLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(mapLink.getAttribute("href")).toContain("Taj%20Falaknuma%20Palace");

    expect(screen.getByText("Scan to RSVP")).toBeInTheDocument();
  });

  it("switches card style when radio options (Royal, Modern, Floral) are clicked", async () => {
    const user = userEvent.setup();
    render(
      <DigitalInvitationCard
        input={{
          hostName: "Aisha & Rahul",
          eventType: "wedding",
          city: "Hyderabad",
          eventDate: "2027-11-20",
        }}
      />
    );

    const modernRadio = screen.getByRole("radio", { name: "Modern" });
    await user.click(modernRadio);
    expect(modernRadio).toBeChecked();

    const floralRadio = screen.getByRole("radio", { name: "Floral" });
    await user.click(floralRadio);
    expect(floralRadio).toBeChecked();
  });
});

describe("iCalendar generator & Google Maps URL", () => {
  it("escapes semicolons, commas, backslashes, and linebreaks in .ics text", () => {
    expect(escapeIcsText("Hello, world; welcome\\home\nnew line")).toBe(
      "Hello\\, world\\; welcome\\\\home\\nnew line"
    );
  });

  it("builds a valid RFC 5545 .ics file structure with start/end dates and metadata", () => {
    const ics = buildIcsCalendar({
      title: "Priya & Rohan's Wedding",
      eventDate: "2027-11-20",
      venueName: "Taj Falaknuma Palace",
      city: "Hyderabad",
      hostName: "The Sharma & Verma Families",
      dressCode: "Traditional Indian / Black Tie",
      theme: "Royal Mughal Elegance",
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Celebrate//Event Invitation//EN");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART;VALUE=DATE:20271120");
    expect(ics).toContain("DTEND;VALUE=DATE:20271121");
    expect(ics).toContain("SUMMARY:Priya & Rohan's Wedding");
    expect(ics).toContain("LOCATION:Taj Falaknuma Palace\\, Hyderabad");
    expect(ics).toContain("Hosted by: The Sharma & Verma Families");
    expect(ics).toContain("Dress code: Traditional Indian / Black Tie");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("handles fallback date gracefully when eventDate is missing or malformed", () => {
    const ics = buildIcsCalendar({
      title: "Surprise Celebration",
      eventDate: "",
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Surprise Celebration");
    expect(ics).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
  });

  it("constructs proper Google Maps search link", () => {
    expect(getGoogleMapsUrl("Grand Hyatt", "Mumbai")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Grand%20Hyatt%2C%20Mumbai"
    );
    expect(getGoogleMapsUrl("ITC Kohenur", "")).toBe(
      "https://www.google.com/maps/search/?api=1&query=ITC%20Kohenur"
    );
    expect(getGoogleMapsUrl("", "Bengaluru")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Bengaluru"
    );
    expect(getGoogleMapsUrl("", "")).toBe("https://www.google.com/maps");
  });
});

describe("Card Style Specifications & Date Parsing", () => {
  it("returns Royal style with gold foil, burgundy gradient, and high-contrast ivory text", () => {
    const config = getCardStyleConfig("royal", "wedding", "Nikah");
    expect(config.style).toBe("royal");
    expect(config.variant).toBe("wedding");
    expect(config.useGoldFoil).toBe(true);
    expect(config.cardBg).toContain("#3B0D14");
    expect(config.bodyTextColor).toBe("#F5EBE1");
    expect(config.labelTextColor).toBe("#E6CA85");
    expect(config.ornamentType).toBe("paisley");
  });

  it("returns Modern style with ivory background, clean lines, and dark text", () => {
    const config = getCardStyleConfig("modern", "birthday");
    expect(config.style).toBe("modern");
    expect(config.variant).toBe("birthday");
    expect(config.useGoldFoil).toBe(false);
    expect(config.cardBg).toBe("#FAF8F5");
    expect(config.bodyTextColor).toBe("#292524");
    expect(config.ornamentType).toBe("geometric");
  });

  it("returns Floral style with soft gradient background and mandala ornament for community", () => {
    const config = getCardStyleConfig("floral", "community", "Diwali");
    expect(config.style).toBe("floral");
    expect(config.variant).toBe("community");
    expect(config.ornamentType).toBe("paisley");
  });

  it("incorporates custom palette colors into backing and accents", () => {
    const customPalette = {
      name: "Sunrise",
      colors: ["#FF5722", "#FF9800", "#FFC107", "#FFE082"] as [
        string,
        string,
        string,
        string,
      ],
    };
    const config = getCardStyleConfig(
      "royal",
      "wedding",
      undefined,
      customPalette
    );
    expect(config.cardBackingBg).toBe("#FF5722");
  });

  it("parses valid and invalid dates reliably", () => {
    const parsed = parseInviteDate("2027-11-20");
    expect(parsed.dayNumber).toBe("20");
    expect(parsed.monthName).toBe("NOV");
    expect(parsed.yearNumber).toBe("2027");
    expect(parsed.weekdayName).toBe("Saturday");

    const fallback = parseInviteDate("");
    expect(fallback.dayNumber).toBe("--");
    expect(fallback.monthName).toBe("DATE");
  });
});
