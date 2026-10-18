import type { Metadata } from "next";
import {
  Instrument_Serif,
  Hanken_Grotesk,
  Cormorant_Garamond,
  DM_Serif_Display,
  Great_Vibes,
  Noto_Serif_Devanagari,
  Noto_Nastaliq_Urdu,
  Noto_Serif_Telugu,
} from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});

// Indian language script fonts loaded with preload: false, display: "swap"
const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  preload: false,
  display: "swap",
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  variable: "--font-urdu",
  preload: false,
  display: "swap",
});

const notoSerifTelugu = Noto_Serif_Telugu({
  subsets: ["telugu"],
  variable: "--font-telugu",
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "Celebrate — Event Planning, Made Easy",
  description:
    "Plan the day they'll remember. A calm, human celebration planner for weddings, birthdays & gatherings with instant budget recalculation and live digital invitations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${hankenGrotesk.variable} ${cormorantGaramond.variable} ${dmSerifDisplay.variable} ${greatVibes.variable} ${notoSerifDevanagari.variable} ${notoNastaliqUrdu.variable} ${notoSerifTelugu.variable}`}
    >
      <body className="min-h-screen bg-[#FBF6EE] font-sans text-[#2B1B14] antialiased selection:bg-[#5B1A2B] selection:text-[#FBF6EE]">
        {/* Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-50 -translate-y-20 rounded-md bg-[#5B1A2B] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#FBF6EE] shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-2"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
