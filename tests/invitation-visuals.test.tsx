import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "./axe-helper";
import DesignerCard from "@/components/invitation/DesignerCard";
import {
  type CardStyle,
  getCardStyleConfig,
  getPillEffectiveColors,
} from "@/lib/invitation";
import type { EventType, EventPalette } from "@/lib/schemas";
import {
  hexToRgb,
  getRelativeLuminance,
  calculateContrastRatio,
} from "@/lib/studio/contrast";

expect.extend(toHaveNoViolations);

describe("Invitation Card Visuals & Architectural Integrity", () => {
  const styles: CardStyle[] = ["royal", "modern", "floral"];
  const eventTypes: EventType[] = ["wedding", "birthday", "community", "other"];

  describe("1. Transparent Wrappers & No Rectangular Box-Shadow", () => {
    styles.forEach((style) => {
      it(`renders ${style} card wrapper with transparent background and no box-shadow`, () => {
        const { getByTestId } = render(
          <DesignerCard
            cardStyle={style}
            data={{
              hostName: "Aisha & Rahul",
              eventType: "wedding",
              eventDate: "2027-11-20",
              city: "Hyderabad",
              cultureOrTradition: "Nikah",
              vibeOrTheme: "Royal Mughal Elegance",
              venueName: "Taj Falaknuma Palace",
              dressCode: "Traditional Silk",
            }}
          />
        );

        const wrapper = getByTestId("designer-card-wrapper");
        expect(wrapper.className).toContain("bg-transparent");
        expect(wrapper.className).toContain("border-0");
        expect(wrapper.className).toContain("shadow-none");
        expect(wrapper.style.filter).toContain("drop-shadow");

        const frontCard = getByTestId("designer-card-front");
        expect(frontCard.className).toContain("shadow-none");
      });
    });

    it("print view shows only the flat card with no back layer, no actions, and filter: none", () => {
      const { getByTestId, queryByTestId, queryByRole } = render(
        <DesignerCard
          cardStyle="royal"
          isPrintView={true}
          data={{
            hostName: "Aisha & Rahul",
            eventType: "wedding",
            eventDate: "2027-11-20",
          }}
        />
      );

      const wrapper = getByTestId("designer-card-wrapper");
      expect(wrapper.style.filter).toBe("none");
      expect(queryByTestId("card-back-layer")).not.toBeInTheDocument();
      expect(
        queryByRole("button", { name: /calendar/i })
      ).not.toBeInTheDocument();
      expect(queryByRole("link", { name: /map/i })).not.toBeInTheDocument();
    });
  });

  describe("2. Subtle Back Layer in Same Shape (No Competing/Yellow Saturated Colors)", () => {
    styles.forEach((style) => {
      it(`renders subtle calm back layer in same shape for ${style} style`, () => {
        const { getByTestId } = render(
          <DesignerCard
            cardStyle={style}
            data={{
              hostName: "Priya & Amit",
              eventType: style === "royal" ? "wedding" : "birthday",
              eventDate: "2027-10-15",
            }}
          />
        );

        const backLayer = getByTestId("card-back-layer");
        const frontCard = getByTestId("designer-card-front");

        expect(backLayer).toBeInTheDocument();
        // Transforms offset ~6px and rotated ~1.5deg
        expect(backLayer.style.transform).toBe(
          "translate3d(6px, 6px, 0) rotate(1.5deg)"
        );

        // Verify backLayer shares the shape classes with frontCard
        if (style === "royal") {
          expect(frontCard.className).toContain("rounded-t-[88px]");
          expect(backLayer.className).toContain("rounded-t-[88px]");
        }

        // Verify back layer is not bright yellow (#D4AF37 or #FFFF00 or #FACC15)
        const config = getCardStyleConfig(style);
        expect(config.backLayerBg.toLowerCase()).not.toBe("#d4af37");
        expect(config.backLayerBg.toLowerCase()).not.toBe("#ffff00");
        expect(config.backLayerBg.toLowerCase()).not.toBe("#facc15");
      });
    });

    it("uses calm back layer even when custom vibrant palette is passed", () => {
      const vibrantPalette: EventPalette = {
        name: "Neon Saffron",
        colors: ["#FFD700", "#FF1493", "#00FF7F", "#FF4500"],
      };

      styles.forEach((style) => {
        const config = getCardStyleConfig(
          style,
          "wedding",
          undefined,
          vibrantPalette
        );
        // Back layer remains calm darker tint and does not adopt saturated bright neon yellow
        expect(config.backLayerBg.toLowerCase()).not.toBe("#ffd700");
        expect(config.backLayerBg.toLowerCase()).not.toBe("#ffff00");
      });
    });
  });

  describe("3. Readable Pills with Contrast Ratio >= 4.5:1 across All Styles & Event Types", () => {
    styles.forEach((style) => {
      eventTypes.forEach((eventType) => {
        it(`guarantees pill text contrast >= 4.5:1 for ${style} card with ${eventType} event`, () => {
          const pillColors = getPillEffectiveColors(style);
          const rgbText = hexToRgb(pillColors.textColor);
          const rgbBg = hexToRgb(pillColors.bgColor);

          const lumText = getRelativeLuminance(rgbText.r, rgbText.g, rgbText.b);
          const lumBg = getRelativeLuminance(rgbBg.r, rgbBg.g, rgbBg.b);
          const contrast = calculateContrastRatio(lumText, lumBg);

          expect(contrast).toBeGreaterThanOrEqual(4.5);

          // Render card with all 4 pills and verify they exist without overflow
          const { getByTestId } = render(
            <DesignerCard
              cardStyle={style}
              data={{
                hostName: "Family & Friends",
                eventType,
                cultureOrTradition: "Traditional Grand Ceremony",
                vibeOrTheme:
                  "Ultra Luxurious Floral Garden Setup with Twinkling Lights",
                venueName: "The Grand Regal Palace Ballroom",
                dressCode: "Black Tie / Formal Traditional Attire",
              }}
            />
          );

          const traditionPill = getByTestId("pill-tradition");
          const themePill = getByTestId("pill-theme");
          const venuePill = getByTestId("pill-venue");
          const dressCodePill = getByTestId("pill-dresscode");

          expect(traditionPill).toBeInTheDocument();
          expect(themePill).toBeInTheDocument();
          expect(venuePill).toBeInTheDocument();
          expect(dressCodePill).toBeInTheDocument();

          // All pills have break-words and line-clamp-2 to prevent overflow
          expect(traditionPill.className).toContain("break-words");
          expect(traditionPill.className).toContain("rounded-full");
          expect(themePill.className).toContain("break-words");
          expect(venuePill.className).toContain("break-words");
          expect(dressCodePill.className).toContain("break-words");
        });
      });
    });
  });

  describe("4. Architectural Divider (Thin line, diamond, thin line — no swirls)", () => {
    it("renders thin lines and small diamond in middle, with no swirl path", () => {
      const { container } = render(
        <DesignerCard
          cardStyle="royal"
          data={{
            hostName: "Aisha & Rahul",
            eventType: "wedding",
          }}
        />
      );

      const dividerSvg = container.querySelector('svg[viewBox="0 0 144 12"]');
      expect(dividerSvg).toBeInTheDocument();

      // Check lines
      const lines = dividerSvg?.querySelectorAll("line");
      expect(lines?.length).toBe(2);

      // Check center diamond polygon
      const diamond = dividerSvg?.querySelector("polygon");
      expect(diamond).toBeInTheDocument();
      expect(diamond?.getAttribute("points")).toContain("72,2.5");

      // Verify no swirl bezier curve path exists in the divider
      const swirlPath = dividerSvg?.querySelector("path");
      expect(swirlPath).toBeNull();
    });
  });

  describe("5. Accessibility (jest-axe zero violations)", () => {
    styles.forEach((style) => {
      it(`has 0 axe violations for ${style} card in screen view`, async () => {
        const { container } = render(
          <DesignerCard
            cardStyle={style}
            data={{
              hostName: "Aisha & Rahul",
              eventType: "wedding",
              eventDate: "2027-11-20",
              city: "Hyderabad",
              cultureOrTradition: "Nikah",
              vibeOrTheme: "Royal Elegance",
              venueName: "Taj Falaknuma",
              dressCode: "Traditional",
            }}
          />
        );

        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it(`has 0 axe violations for ${style} card in print view`, async () => {
        const { container } = render(
          <DesignerCard
            cardStyle={style}
            isPrintView={true}
            data={{
              hostName: "Aisha & Rahul",
              eventType: "wedding",
              eventDate: "2027-11-20",
              city: "Hyderabad",
            }}
          />
        );

        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });
});
