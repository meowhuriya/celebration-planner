import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "./axe-helper";
import HangingInvitationCard from "@/components/HangingInvitationCard";

expect.extend(toHaveNoViolations);

describe("HangingInvitationCard Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with custom host name and all required card fields", async () => {
    render(
      <HangingInvitationCard
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

    // Wait for 200ms debounce
    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    expect(
      screen.getByRole("region", { name: /invitation card/i })
    ).toBeInTheDocument();
    expect(screen.getByText("YOU'RE INVITED")).toBeInTheDocument();
    expect(screen.getByText("Aisha & Rahul")).toBeInTheDocument();
    expect(screen.getByText("invites you to celebrate")).toBeInTheDocument();
    expect(screen.getByText(/Wedding/i)).toBeInTheDocument();
    expect(screen.getByText(/Hyderabad/i)).toBeInTheDocument();
    expect(
      screen.getByText(/We would love to have you with us/i)
    ).toBeInTheDocument();
  });

  it("uses friendly fallback 'You are invited' when host name is empty", async () => {
    render(
      <HangingInvitationCard
        input={{
          hostName: "",
          eventType: "birthday",
          city: "Mumbai",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    expect(screen.getByText("You are invited")).toBeInTheDocument();
    expect(screen.getByText(/Birthday/i)).toBeInTheDocument();
  });

  it("updates live when props change", async () => {
    const { rerender } = render(
      <HangingInvitationCard
        input={{
          hostName: "Initial Host",
          eventType: "wedding",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });
    expect(screen.getByText("Initial Host")).toBeInTheDocument();

    rerender(
      <HangingInvitationCard
        input={{
          hostName: "Updated Host",
          eventType: "birthday",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });
    expect(screen.getByText("Updated Host")).toBeInTheDocument();
  });

  it("handles keyboard nudges without throwing", async () => {
    render(
      <HangingInvitationCard
        input={{
          hostName: "Priya & Amit",
          eventType: "community",
          cultureOrTradition: "Diwali",
        }}
      />
    );

    const cardRegion = screen.getByRole("region", { name: /invitation card/i });
    expect(cardRegion).toHaveAttribute("tabindex", "0");

    // Nudge left, right, up, down, space, enter, escape
    fireEvent.keyDown(cardRegion, { key: "ArrowLeft" });
    fireEvent.keyDown(cardRegion, { key: "ArrowRight" });
    fireEvent.keyDown(cardRegion, { key: "ArrowUp" });
    fireEvent.keyDown(cardRegion, { key: "ArrowDown" });
    fireEvent.keyDown(cardRegion, { key: " " });
    fireEvent.keyDown(cardRegion, { key: "Enter" });
    fireEvent.keyDown(cardRegion, { key: "Escape" });
    fireEvent.keyDown(cardRegion, { key: "Home" });
  });

  it("handles copy invite text action and announces via aria-live", async () => {
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
          hostName: "The Sharma Family",
          eventType: "birthday",
          city: "Mumbai",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    const copyBtn = screen.getByRole("button", { name: /copy invite text/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledOnce();
    expect(screen.getByText(/invite text copied/i)).toBeInTheDocument();
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("renders accessible WhatsApp link with encoded message", async () => {
    render(
      <HangingInvitationCard
        input={{
          hostName: "Greenwood Community Club",
          eventType: "community",
          city: "Delhi",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    const whatsappLink = screen.getByRole("link", {
      name: /share on whatsapp/i,
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
      <HangingInvitationCard
        input={{
          hostName: "Aisha & Rahul",
          eventType: "wedding",
        }}
      />
    );

    const printBtn = screen.getByRole("button", {
      name: /print or save as pdf/i,
    });
    await user.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
  });

  it("has zero accessibility violations (jest-axe) for wedding", async () => {
    const { container } = render(
      <HangingInvitationCard
        input={{
          hostName: "Aisha & Rahul",
          eventType: "wedding",
          city: "Hyderabad",
          eventDate: "2027-11-20",
          cultureOrTradition: "Nikah & Sangeet",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has zero accessibility violations (jest-axe) for birthday", async () => {
    const { container } = render(
      <HangingInvitationCard
        input={{
          hostName: "The Sharma Family",
          eventType: "birthday",
          city: "Mumbai",
          eventDate: "2027-08-15",
          vibeOrTheme: "Superhero Party",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has zero accessibility violations (jest-axe) for community Diwali", async () => {
    const { container } = render(
      <HangingInvitationCard
        input={{
          hostName: "Greenwood Club",
          eventType: "community",
          city: "Delhi",
          eventDate: "2027-11-01",
          cultureOrTradition: "Diwali Puja",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("switches seamlessly between Designer Card, Use my own design, and Card Studio tabs", async () => {
    const user = userEvent.setup();
    render(
      <HangingInvitationCard
        input={{
          hostName: "Aisha & Rahul",
          eventType: "wedding",
          city: "Hyderabad",
        }}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    // Default mode is Designer Card
    expect(screen.getByRole("tab", { name: /Designer Card/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    // Click "Use my own design"
    const ownDesignTab = screen.getByRole("tab", {
      name: /Use my own design/i,
    });
    await user.click(ownDesignTab);
    expect(ownDesignTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/In Canva choose/i)).toBeInTheDocument();

    // Click "Card Studio"
    const studioTab = screen.getByRole("tab", { name: /Card Studio/i });
    await user.click(studioTab);
    expect(studioTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/STARTER DESIGNS/i)).toBeInTheDocument();

    // Switch back to Designer Card
    const designerTab = screen.getByRole("tab", { name: /Designer Card/i });
    await user.click(designerTab);
    expect(designerTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("YOU'RE INVITED")).toBeInTheDocument();
  });
});
