"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type {
  EventInput,
  EventPlan,
  PlanSection,
  EventType,
} from "@/lib/schemas";
import {
  recalculateBudget,
  recalculateBudgetForGuests,
  formatINR,
} from "@/lib/utils";
import { savePlan } from "@/lib/storage";
import { calculateReadinessScore } from "@/lib/editorial";
import EventForm from "@/components/EventForm";
import PlanDisplay from "@/components/PlanDisplay";
import WhatIfSliders from "@/components/WhatIfSliders";
import ExampleScenarios from "@/components/ExampleScenarios";
import SavedPlans from "@/components/SavedPlans";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import HangingInvitationCard from "@/components/HangingInvitationCard";

// Editorial Components
import TopBar from "./editorial/TopBar";
import CursorRing from "./editorial/CursorRing";
import BigWordmark from "./editorial/BigWordmark";
import ScrambleText from "./editorial/ScrambleText";
import EventTypeSelector from "./editorial/EventTypeSelector";
import ReadinessScore from "./editorial/ReadinessScore";
import Reveal from "./editorial/Reveal";
import SectionLabel from "./editorial/SectionLabel";
import SafeBoundary from "./editorial/SafeBoundary";
import LiveCountdown from "./editorial/LiveCountdown";
import DarkFooter from "./editorial/DarkFooter";
import Ribbon3D from "./editorial/Ribbon3D";
import HeroDecoration, {
  CelebrateBurstButton,
  FestiveHeroScene,
  type HeroDecorationRef,
} from "./editorial/HeroDecoration";
import { getFallbackPalette, getPaletteCssVariables } from "@/lib/palette";
import { generateFallbackPlan } from "@/lib/fallback";
import { EXAMPLE_SCENARIOS } from "@/lib/examples";

type AppState = "idle" | "loading" | "success" | "error";

export default function EventPlanner() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [plan, setPlan] = useState<EventPlan | null>(null);
  const [eventInput, setEventInput] = useState<EventInput | null>(null);
  const [currentFormValues, setCurrentFormValues] = useState<
    Partial<EventInput>
  >(() => ({
    ...EXAMPLE_SCENARIOS[0].input,
  }));
  const [errorMessage, setErrorMessage] = useState("");
  const [regeneratingSection, setRegeneratingSection] =
    useState<PlanSection | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [hoveredEventType, setHoveredEventType] = useState<EventType | null>(
    null
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const heroDecorationRef = useRef<HeroDecorationRef>(null);

  const handleCancelGenerate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAppState("idle");
  }, []);

  const handleGenerate = useCallback(async (input: EventInput) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAppState("loading");
    setErrorMessage("");
    setEventInput(input);
    setCurrentFormValues(input);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      const data = (await response.json()) as {
        plan?: EventPlan;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate plan");
      }

      if (!data.plan) {
        throw new Error("No plan data received");
      }

      setPlan(data.plan);
      setAppState("success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const errText =
        error instanceof Error
          ? error.message
          : "Failed to generate event plan";
      console.warn(
        "[EventPlanner] Live generation failed, serving fallback plan:",
        errText
      );

      // Make failures visible: show clear message and fallback plan instead of doing nothing or showing an empty screen
      const fallback = generateFallbackPlan(input);
      setPlan(fallback);
      setErrorMessage(errText);
      setAppState("success");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const handleExampleSelect = useCallback(
    (input: EventInput) => {
      setCurrentFormValues(input);
      handleGenerate(input);
    },
    [handleGenerate]
  );

  const handleEventTypeSelect = useCallback((type: EventType) => {
    setCurrentFormValues((prev) => ({
      ...prev,
      eventType: type,
    }));
  }, []);

  const handleTraditionSelect = useCallback((updatedTradition: string) => {
    setCurrentFormValues((prev) => ({
      ...prev,
      cultureOrTradition: updatedTradition,
    }));
  }, []);

  const handleRegenerate = useCallback(
    async (section: PlanSection) => {
      if (!eventInput || !plan) return;
      setRegeneratingSection(section);

      try {
        const response = await fetch("/api/regenerate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, eventInput }),
        });

        const data = (await response.json()) as {
          section?: Partial<EventPlan>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to regenerate section");
        }

        if (data.section) {
          setPlan((prev) => (prev ? { ...prev, ...data.section } : prev));
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to regenerate section"
        );
      } finally {
        setRegeneratingSection(null);
      }
    },
    [eventInput, plan]
  );

  const handleBudgetChange = useCallback((newTotal: number) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const updated = recalculateBudget(prev.budget, newTotal);
      return { ...prev, budget: updated };
    });
    setEventInput((prev) => (prev ? { ...prev, totalBudget: newTotal } : prev));
  }, []);

  const handleGuestCountChange = useCallback((newGuestCount: number) => {
    setEventInput((prevInput) => {
      if (!prevInput) return prevInput;
      setPlan((prevPlan) => {
        if (!prevPlan) return prevPlan;
        const updated = recalculateBudgetForGuests(
          prevPlan.budget,
          prevInput.guestCount,
          newGuestCount,
          prevInput.totalBudget
        );
        return { ...prevPlan, budget: updated };
      });
      return { ...prevInput, guestCount: newGuestCount };
    });
  }, []);

  const handlePlanUpdate = useCallback((updatedPlan: EventPlan) => {
    setPlan(updatedPlan);
  }, []);

  const handleSave = useCallback(() => {
    if (!plan || !eventInput) return;
    try {
      savePlan(eventInput, plan);
      setSaveStatus("Saved plan to this device");
      setTimeout(() => setSaveStatus(""), 4000);
    } catch {
      setSaveStatus("Failed to save plan locally");
      setTimeout(() => setSaveStatus(""), 4000);
    }
  }, [plan, eventInput]);

  const handleLoadPlan = useCallback((p: EventPlan, input: EventInput) => {
    setPlan(p);
    setEventInput(input);
    setCurrentFormValues(input);
    setAppState("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleStartOver = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAppState("idle");
    setPlan(null);
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const readinessScore = useMemo(() => {
    if (!plan || !eventInput) return 0;
    return calculateReadinessScore(plan, eventInput);
  }, [plan, eventInput]);

  const activePalette = useMemo(() => {
    if (plan?.palette) return plan.palette;
    return getFallbackPalette(eventInput || currentFormValues);
  }, [plan?.palette, eventInput, currentFormValues]);

  const paletteStyles = useMemo(
    () => getPaletteCssVariables(activePalette) as React.CSSProperties,
    [activePalette]
  );

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    }
  };

  const handleScrollToForm = useCallback(() => {
    scrollToSection("intake");
    setTimeout(() => {
      const firstField = document.getElementById("hostName");
      firstField?.focus();
    }, 300);
  }, []);

  return (
    <div
      className="relative min-h-screen bg-[#FBF6EE] text-[#2B1B14]"
      style={paletteStyles}
    >
      <SafeBoundary name="CursorRing">
        <CursorRing />
      </SafeBoundary>
      <TopBar isPlanShowing={appState === "success" && Boolean(plan)} />

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        {appState === "idle" && (
          <div className="space-y-16">
            {/* HERO SECTION */}
            <section id="home" className="relative pt-6 sm:pt-10">
              {/* Event-aware hero background decoration: garland, mandala, diyas, lantern, bunting, drifting particles */}
              <SafeBoundary name="HeroDecoration">
                <HeroDecoration
                  ref={heroDecorationRef}
                  eventType={currentFormValues.eventType}
                  cultureOrTradition={currentFormValues.cultureOrTradition}
                  vibeOrTheme={currentFormValues.vibeOrTheme}
                  palette={activePalette}
                  hoveredType={hoveredEventType}
                  className="pointer-events-none absolute inset-0 z-0"
                />
              </SafeBoundary>

              {/* 3D Twisting Ribbon: agency-inspired undulating capsule panels */}
              <div className="relative z-10 mb-6 sm:mb-8">
                <SafeBoundary name="Ribbon3D">
                  <Ribbon3D
                    eventType={currentFormValues.eventType}
                    cultureOrTradition={currentFormValues.cultureOrTradition}
                    vibeOrTheme={currentFormValues.vibeOrTheme}
                    palette={activePalette}
                  />
                </SafeBoundary>
              </div>

              <div className="relative z-10 mb-4 flex items-center justify-between">
                <SafeBoundary name="ScrambleText">
                  <ScrambleText targetText="Event planning, made easy" />
                </SafeBoundary>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
                  Free · No sign-up
                </span>
              </div>

              {/* Clean whitespace with Hero Headline on left and "Private by design" card on top right */}
              <div className="relative z-10 mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                <div className="flex-1">
                  <SafeBoundary name="BigWordmark">
                    <BigWordmark />
                  </SafeBoundary>
                </div>

                {/* Top Right "Private by design" note card (gives card a distinct job: no duplicate button) */}
                <div className="w-full sm:max-w-xs lg:w-72 lg:shrink-0">
                  <div className="shadow-xs rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full bg-[#E07A1F]"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
                        Private by design
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug text-[#2B1B14]">
                      Free · Saved on your device
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#6B5848]">
                      No account or sign-up needed. Your guest list, budgets,
                      and seating charts stay private in your browser.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hero Lower: Intro + CTA on left, Hanging Card on right */}
              <div className="relative z-10 grid gap-12 lg:grid-cols-12 lg:items-start">
                <div className="space-y-6 lg:col-span-7">
                  <SafeBoundary name="Reveal-Intro">
                    <Reveal>
                      <p className="max-w-2xl text-base leading-relaxed text-[#6B5848] sm:text-lg">
                        Tell us about your event and get a budget, timeline,
                        vendor checklist, and ideas in seconds.
                      </p>
                    </Reveal>
                  </SafeBoundary>

                  {/* Celebrate Burst Button */}
                  <div className="pt-0.5">
                    <CelebrateBurstButton
                      onBurst={() => heroDecorationRef.current?.triggerBurst()}
                    />
                  </div>

                  {/* Single Primary Call to Action next to Headline */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => scrollToSection("intake")}
                      className="group inline-flex items-center gap-3 rounded-full bg-[#5B1A2B] px-8 py-3.5 text-base font-semibold text-[#FBF6EE] shadow-sm transition-all duration-300 hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-2"
                    >
                      <span>Start planning</span>
                      <span
                        className="transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </button>

                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
                      <span className="h-2 w-2 rounded-full bg-[#E07A1F]" />
                      <span>Free to use</span>
                    </div>
                  </div>

                  {/* Highlights Row: 3 Feature Cards */}
                  <div className="grid grid-cols-3 gap-3 border-t border-[#E8DCC8] pt-6">
                    <div className="shadow-2xs rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-3.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
                        Design
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-[#2B1B14]">
                        Venue designer
                      </span>
                    </div>
                    <div className="shadow-2xs rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-3.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
                        Arrange
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-[#2B1B14]">
                        Seating plan
                      </span>
                    </div>
                    <div className="shadow-2xs rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] p-3.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
                        Invite
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-[#2B1B14]">
                        QR RSVP
                      </span>
                    </div>
                  </div>

                  {/* FESTIVE FLORAL SCENE IN EMPTY AREA BELOW 3 FEATURE CARDS */}
                  <div className="shadow-2xs relative mt-8 min-h-[360px] w-full select-none overflow-hidden rounded-2xl border border-[#E8DCC8]/70 bg-[#FFFDF8]/50 p-4">
                    <SafeBoundary name="FestiveHeroScene">
                      <FestiveHeroScene
                        eventType={currentFormValues.eventType}
                        cultureOrTradition={
                          currentFormValues.cultureOrTradition
                        }
                        vibeOrTheme={currentFormValues.vibeOrTheme}
                        palette={activePalette}
                        hoveredType={hoveredEventType}
                      />
                    </SafeBoundary>
                  </div>
                </div>

                {/* Right Hero Side: Hanging Invitation Card */}
                <aside
                  aria-label="Interactive digital invitation preview"
                  className="flex justify-center lg:col-span-5"
                >
                  <div className="w-full max-w-[360px] space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2B1B14]">
                        Digital invitation
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DCC8] bg-[#FFFDF8] px-3 py-0.5 text-xs font-medium text-[#6B5848]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5B1A2B]" />
                        <span>Interactive</span>
                      </span>
                    </div>
                    <SafeBoundary name="HangingInvitationCard-hero">
                      <HangingInvitationCard
                        input={currentFormValues}
                        palette={activePalette}
                      />
                    </SafeBoundary>
                  </div>
                </aside>
              </div>
            </section>

            {/* EVENT TYPE SELECTOR */}
            <section aria-label="Event category selection">
              <SafeBoundary name="Reveal-EventType">
                <Reveal>
                  <div className="mb-4">
                    <SectionLabel label="Celebrations" />
                    <h2 className="mt-1 font-serif text-2xl font-normal tracking-tight text-[#111111] sm:text-3xl">
                      Choose your <span className="italic">celebration</span>
                    </h2>
                  </div>
                </Reveal>
              </SafeBoundary>
              <SafeBoundary name="EventTypeSelector">
                <EventTypeSelector
                  selectedType={currentFormValues.eventType ?? "wedding"}
                  onSelectType={handleEventTypeSelect}
                  onHoverType={setHoveredEventType}
                  cultureOrTradition={
                    currentFormValues.cultureOrTradition ?? ""
                  }
                  onSelectTradition={handleTraditionSelect}
                />
              </SafeBoundary>
            </section>

            {/* EXAMPLE SCENARIOS */}
            <ExampleScenarios onSelect={handleExampleSelect} />

            {/* SAVED PLANS ARCHIVE */}
            <SavedPlans onLoad={handleLoadPlan} />

            {/* INTAKE FORM SECTION */}
            <section id="intake" aria-label="Event details form">
              <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-8">
                  <EventForm
                    initialValues={currentFormValues}
                    onSubmit={handleGenerate}
                    onInputChange={setCurrentFormValues}
                  />
                </div>

                <div className="space-y-6 lg:col-span-4">
                  <div className="space-y-3 rounded-2xl border border-[#D9D9D9] bg-[#F7F7F7] p-6">
                    <SectionLabel label="Privacy & control" />
                    <h3 className="font-serif text-xl font-normal text-[#111111]">
                      Your plans stay <span className="italic">yours</span>
                    </h3>
                    <p className="text-xs leading-relaxed text-[#5A5A5A]">
                      Everything you enter is stored privately on your device.
                      You can download a clean PDF or share your invite directly
                      over WhatsApp at any time.
                    </p>
                    <div className="border-t border-[#D9D9D9] pt-3 text-xs text-[#5A5A5A]">
                      Free to use · No account needed
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[#D9D9D9] bg-white p-6">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#111111]">
                      Live invitation preview
                    </span>
                    <p className="text-xs text-[#5A5A5A]">
                      The hanging card updates in real time as you adjust the
                      host name, date, theme, or city.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {appState === "loading" && (
          <div className="space-y-12 py-8">
            {eventInput && (
              <div className="mx-auto max-w-sm space-y-3">
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-1 text-xs font-medium text-[#2B1B14]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5B1A2B]" />
                    Invitation ready
                  </span>
                </div>
                <SafeBoundary name="HangingInvitationCard-loading">
                  <HangingInvitationCard
                    input={eventInput}
                    palette={activePalette}
                  />
                </SafeBoundary>
              </div>
            )}
            <LoadingState onCancel={handleCancelGenerate} />
          </div>
        )}

        {appState === "error" && (
          <div className="py-12">
            <ErrorState message={errorMessage} onRetry={handleStartOver} />
          </div>
        )}

        {appState === "success" && plan && eventInput && (
          <div className="space-y-10">
            {/* STICKY SUMMARY BAR */}
            <div className="sticky top-[53px] z-30 -mx-4 border-y border-[#E8DCC8] bg-[#FBF6EE]/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
                  <span className="rounded-full bg-[#5B1A2B] px-2.5 py-0.5 text-xs text-[#FBF6EE]">
                    {eventInput.eventType}
                  </span>
                  <span>{eventInput.city}</span>
                  <span className="text-[#6B5848]">·</span>
                  <span>{eventInput.guestCount} guests</span>
                  <span className="text-[#6B5848]">·</span>
                  <span>{formatINR(eventInput.totalBudget)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-full border border-[#5B1A2B] bg-[#5B1A2B] px-4 py-1.5 text-xs font-semibold text-[#FBF6EE] transition-colors hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
                  >
                    Save plan
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-full border border-[#E8DCC8] bg-[#FFFDF8] px-4 py-1.5 text-xs font-semibold text-[#2B1B14] transition-colors hover:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
                  >
                    Print / PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="rounded-full border border-[#E8DCC8] bg-[#FFFDF8] px-4 py-1.5 text-xs font-semibold text-[#6B5848] transition-colors hover:border-[#5B1A2B] hover:text-[#2B1B14] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
                  >
                    ← Start over
                  </button>
                </div>
              </div>
            </div>

            {/* Save status notification */}
            {saveStatus && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-[#5B1A2B] bg-[#3A0F1C] p-3 text-center text-xs font-medium text-[#FBF6EE]"
              >
                ✓ {saveStatus}
              </div>
            )}

            {/* LIVE COUNTDOWN AT TOP OF RESULTS */}
            <SafeBoundary name="LiveCountdown">
              <LiveCountdown eventDate={eventInput.eventDate} />
            </SafeBoundary>

            {/* Results Header: Title + Readiness Score */}
            <div className="grid gap-6 md:grid-cols-12 md:items-center">
              <div className="md:col-span-8">
                <SectionLabel label="Your plan" />
                <h1 className="mt-2 font-serif text-3xl font-normal tracking-tight text-[#2B1B14] sm:text-4xl">
                  {eventInput.eventType.charAt(0).toUpperCase() +
                    eventInput.eventType.slice(1)}{" "}
                  celebration <span className="italic">plan</span>
                </h1>
                <p className="mt-1 text-sm text-[#6B5848]">
                  Scheduled for{" "}
                  {new Date(eventInput.eventDate).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  in {eventInput.city}
                </p>
              </div>

              <div className="md:col-span-4">
                <SafeBoundary name="ReadinessScore">
                  <ReadinessScore score={readinessScore} />
                </SafeBoundary>
              </div>
            </div>

            {/* Digital Invitation Card at Top of Results */}
            <div className="rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DCC8] pb-3">
                <div>
                  <SectionLabel label="Digital invitation" />
                  <h3 className="mt-1 font-serif text-2xl font-normal text-[#2B1B14]">
                    Invitation <span className="italic">card</span>
                  </h3>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848]">
                  Share via WhatsApp or save as PDF
                </span>
              </div>
              <div className="mx-auto w-full transition-all">
                <SafeBoundary name="HangingInvitationCard-results">
                  <HangingInvitationCard
                    input={eventInput}
                    palette={activePalette}
                  />
                </SafeBoundary>
              </div>
            </div>

            {/* What-If Sliders for Real-time recalculation */}
            <WhatIfSliders
              eventInput={eventInput}
              onBudgetChange={handleBudgetChange}
              onGuestCountChange={handleGuestCountChange}
            />

            {/* Reordered Plan Sections: Budget, Floor plan, Seating, Timeline, Vendors, Ideas, Schedule, Backup plan */}
            <PlanDisplay
              plan={plan}
              eventInput={eventInput}
              onRegenerate={handleRegenerate}
              onPlanUpdate={handlePlanUpdate}
              regeneratingSection={regeneratingSection}
              errorMessage={errorMessage}
              onRetry={() => handleGenerate(eventInput)}
              onGuestCountChange={handleGuestCountChange}
            />
          </div>
        )}
      </main>

      {/* Footer / About Section */}
      <SafeBoundary name="DarkFooter">
        <DarkFooter onStartPlanning={handleScrollToForm} />
      </SafeBoundary>
    </div>
  );
}
