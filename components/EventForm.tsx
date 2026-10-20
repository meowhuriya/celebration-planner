"use client";

import { useState, useEffect } from "react";
import type { EventInput, CurrencyCode } from "@/lib/schemas";
import { EVENT_TYPES, CURRENCIES } from "@/lib/schemas";
import SectionLabel from "./editorial/SectionLabel";

interface EventFormProps {
  initialValues?: Partial<EventInput> | null;
  onSubmit: (input: EventInput) => void;
  onInputChange?: (values: Partial<EventInput>) => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community",
  other: "Other",
};

export default function EventForm({
  initialValues,
  onSubmit,
  onInputChange,
}: EventFormProps) {
  const [hostName, setHostName] = useState(initialValues?.hostName ?? "");
  const [eventType, setEventType] = useState<string>(
    initialValues?.eventType ?? ""
  );
  const [eventDate, setEventDate] = useState(initialValues?.eventDate ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [guestCount, setGuestCount] = useState(
    initialValues?.guestCount ? String(initialValues.guestCount) : ""
  );
  const [totalBudget, setTotalBudget] = useState(
    initialValues?.totalBudget ? String(initialValues.totalBudget) : ""
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    initialValues?.currency ?? "INR"
  );
  const [vibeOrTheme, setVibeOrTheme] = useState(
    initialValues?.vibeOrTheme ?? ""
  );
  const [cultureOrTradition, setCultureOrTradition] = useState(
    initialValues?.cultureOrTradition ?? ""
  );
  const [venueName, setVenueName] = useState(initialValues?.venueName ?? "");
  const [dressCode, setDressCode] = useState(initialValues?.dressCode ?? "");
  const [specialRequirements, setSpecialRequirements] = useState(
    initialValues?.specialRequirements ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync when initialValues prop updates (e.g. example chosen or event type selector)
  useEffect(() => {
    if (!initialValues) return;
    if (initialValues.hostName !== undefined)
      setHostName(initialValues.hostName);
    if (initialValues.eventType) setEventType(initialValues.eventType);
    if (initialValues.eventDate) setEventDate(initialValues.eventDate);
    if (initialValues.city) setCity(initialValues.city);
    if (initialValues.guestCount)
      setGuestCount(String(initialValues.guestCount));
    if (initialValues.totalBudget)
      setTotalBudget(String(initialValues.totalBudget));
    if (initialValues.currency) setCurrency(initialValues.currency);
    if (initialValues.vibeOrTheme !== undefined)
      setVibeOrTheme(initialValues.vibeOrTheme);
    if (initialValues.cultureOrTradition !== undefined)
      setCultureOrTradition(initialValues.cultureOrTradition);
    if (initialValues.venueName !== undefined)
      setVenueName(initialValues.venueName);
    if (initialValues.dressCode !== undefined)
      setDressCode(initialValues.dressCode);
    if (initialValues.specialRequirements !== undefined)
      setSpecialRequirements(initialValues.specialRequirements);
  }, [initialValues]);

  // Debounce notification to parent for live digital invitation card updates
  useEffect(() => {
    const timer = setTimeout(() => {
      onInputChange?.({
        hostName,
        eventType: eventType as EventInput["eventType"],
        eventDate,
        city,
        guestCount: guestCount ? parseInt(guestCount, 10) : undefined,
        totalBudget: totalBudget ? parseFloat(totalBudget) : undefined,
        currency,
        vibeOrTheme,
        cultureOrTradition,
        venueName,
        dressCode,
        specialRequirements,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [
    hostName,
    eventType,
    eventDate,
    city,
    guestCount,
    totalBudget,
    currency,
    vibeOrTheme,
    cultureOrTradition,
    venueName,
    dressCode,
    specialRequirements,
    onInputChange,
  ]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (hostName.length > 100) {
      newErrors.hostName = "Host name must be 100 characters or fewer";
    }
    if (!eventType) newErrors.eventType = "Please select an event type";
    if (!eventDate) newErrors.eventDate = "Event date is required";
    else if (new Date(eventDate) < new Date()) {
      newErrors.eventDate = "Event date must be in the future";
    }
    if (!city.trim()) newErrors.city = "City is required";
    else if (city.length > 100)
      newErrors.city = "City must be 100 characters or fewer";

    const guestNum = parseInt(guestCount, 10);
    if (!guestCount || isNaN(guestNum) || guestNum < 1) {
      newErrors.guestCount = "Guest count must be at least 1";
    } else if (guestNum > 10000) {
      newErrors.guestCount = "Guest count must be 10,000 or fewer";
    }

    const budgetNum = parseFloat(totalBudget);
    if (!totalBudget || isNaN(budgetNum) || budgetNum < 1000) {
      newErrors.totalBudget = "Budget must be at least 1,000";
    } else if (budgetNum > 100000000) {
      newErrors.totalBudget = "Budget must be 100,000,000 or fewer";
    }

    if (vibeOrTheme.length > 200) {
      newErrors.vibeOrTheme = "Theme must be 200 characters or fewer";
    }
    if (cultureOrTradition.length > 200) {
      newErrors.cultureOrTradition =
        "Culture/tradition must be 200 characters or fewer";
    }
    if (venueName.length > 60) {
      newErrors.venueName = "Venue name must be 60 characters or fewer";
    }
    if (dressCode.length > 60) {
      newErrors.dressCode = "Dress code must be 60 characters or fewer";
    }
    if (specialRequirements.length > 500) {
      newErrors.specialRequirements =
        "Special requirements must be 500 characters or fewer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector(
          "[aria-invalid='true'], [role='alert']"
        );
        if (firstErrorEl) {
          (firstErrorEl as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          (firstErrorEl as HTMLElement).focus?.();
        }
      }, 50);
      return;
    }

    const input: EventInput = {
      hostName: hostName.trim(),
      eventType: eventType as EventInput["eventType"],
      eventDate,
      city: city.trim(),
      guestCount: parseInt(guestCount, 10),
      totalBudget: parseFloat(totalBudget),
      currency,
      vibeOrTheme: vibeOrTheme.trim(),
      cultureOrTradition: cultureOrTradition.trim(),
      venueName: venueName.trim(),
      dressCode: dressCode.trim(),
      specialRequirements: specialRequirements.trim(),
    };

    onSubmit(input);
  };

  // Minimum date is tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <form
      id="intake-form"
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-6 transition-all duration-300 sm:p-8"
      noValidate
    >
      <div className="mb-6">
        <SectionLabel label="Event details" />
        <h3 className="mt-2 font-serif text-2xl font-normal tracking-tight text-[#2B1B14] sm:text-3xl">
          Event <span className="italic">details</span>
        </h3>
        <p className="mt-1 text-sm text-[#6B5848]">
          Tell us about your celebration to get a personalized budget, timeline,
          vendors, and ideas.
        </p>
      </div>

      {/* Host Name(s) */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <label
            htmlFor="hostName"
            className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
          >
            Host Name(s){" "}
            <span className="font-normal text-[#6B5848]">(Optional)</span>
          </label>
          <span className="text-xs text-[#6B5848]">{hostName.length}/100</span>
        </div>
        <input
          id="hostName"
          type="text"
          value={hostName}
          onChange={(e) => {
            setHostName(e.target.value);
            if (errors.hostName) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.hostName;
                return next;
              });
            }
          }}
          placeholder="e.g., Aisha & Rahul, The Khan Family"
          maxLength={100}
          className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          aria-describedby={
            errors.hostName ? "hostName-error" : "hostName-help"
          }
          aria-invalid={!!errors.hostName}
        />
        <p id="hostName-help" className="mt-1.5 text-xs text-[#6B5848]">
          Appears on your digital invitation card. Leave blank for &ldquo;You
          are invited&rdquo;.
        </p>
        {errors.hostName && (
          <p
            id="hostName-error"
            className="mt-1.5 text-xs font-medium text-red-600"
            role="alert"
          >
            {errors.hostName}
          </p>
        )}
      </div>

      {/* Event Type */}
      <fieldset className="mb-6">
        <legend className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]">
          Event Type <span className="text-red-600">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {EVENT_TYPES.map((type) => {
            const isSelected = eventType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setEventType(type);
                  if (errors.eventType) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.eventType;
                      return next;
                    });
                  }
                }}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-1 ${
                  isSelected
                    ? "border-[#5B1A2B] bg-[#5B1A2B] text-[#FBF6EE]"
                    : "border-[#E8DCC8] bg-[#FFFDF8] text-[#2B1B14] hover:border-[#5B1A2B]"
                }`}
                aria-pressed={isSelected}
              >
                {EVENT_TYPE_LABELS[type] ?? type}
              </button>
            );
          })}
        </div>
        {errors.eventType && (
          <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
            {errors.eventType}
          </p>
        )}
      </fieldset>

      {/* Date and City */}
      <div className="mb-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="eventDate"
            className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
          >
            Event Date <span className="text-red-600">*</span>
          </label>
          <input
            id="eventDate"
            type="date"
            min={minDateStr}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            suppressHydrationWarning
            className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            aria-describedby={errors.eventDate ? "eventDate-error" : undefined}
            aria-invalid={!!errors.eventDate}
            required
          />
          {errors.eventDate && (
            <p
              id="eventDate-error"
              className="mt-1.5 text-xs font-medium text-red-600"
              role="alert"
            >
              {errors.eventDate}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="city"
            className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
          >
            City <span className="text-red-600">*</span>
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Hyderabad, Mumbai, Delhi"
            maxLength={100}
            className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            aria-describedby={errors.city ? "city-error" : undefined}
            aria-invalid={!!errors.city}
            required
          />
          {errors.city && (
            <p
              id="city-error"
              className="mt-1.5 text-xs font-medium text-red-600"
              role="alert"
            >
              {errors.city}
            </p>
          )}
        </div>
      </div>

      {/* Guest Count and Budget */}
      <div className="mb-6 grid gap-5 sm:grid-cols-3">
        <div>
          <label
            htmlFor="guestCount"
            className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
          >
            Guest Count <span className="text-red-600">*</span>
          </label>
          <input
            id="guestCount"
            type="number"
            min={1}
            max={10000}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="e.g., 200"
            className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            aria-describedby={
              errors.guestCount ? "guestCount-error" : undefined
            }
            aria-invalid={!!errors.guestCount}
            required
          />
          {errors.guestCount && (
            <p
              id="guestCount-error"
              className="mt-1.5 text-xs font-medium text-red-600"
              role="alert"
            >
              {errors.guestCount}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="totalBudget"
            className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
          >
            Total Budget <span className="text-red-600">*</span>
          </label>
          <input
            id="totalBudget"
            type="number"
            min={1000}
            max={100000000}
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            placeholder="e.g., 3000000"
            className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            aria-describedby={
              errors.totalBudget ? "totalBudget-error" : undefined
            }
            aria-invalid={!!errors.totalBudget}
            required
          />
          {errors.totalBudget && (
            <p
              id="totalBudget-error"
              className="mt-1.5 text-xs font-medium text-red-600"
              role="alert"
            >
              {errors.totalBudget}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="currency"
            className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
          >
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Theme / Vibe */}
      <div className="mb-6">
        <label
          htmlFor="vibeOrTheme"
          className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
        >
          Theme or Vibe{" "}
          <span className="font-normal text-[#6B5848]">(Optional)</span>
        </label>
        <input
          id="vibeOrTheme"
          type="text"
          value={vibeOrTheme}
          onChange={(e) => setVibeOrTheme(e.target.value)}
          placeholder="e.g., Royal Mughal elegance, Rustic garden party, Modern minimalist"
          maxLength={200}
          className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          aria-describedby={
            errors.vibeOrTheme ? "vibeOrTheme-error" : undefined
          }
        />
        {errors.vibeOrTheme && (
          <p
            id="vibeOrTheme-error"
            className="mt-1.5 text-xs font-medium text-red-600"
            role="alert"
          >
            {errors.vibeOrTheme}
          </p>
        )}
      </div>

      {/* Culture / Tradition */}
      <div className="mb-6">
        <label
          htmlFor="cultureOrTradition"
          className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
        >
          Culture or Tradition{" "}
          <span className="font-normal text-[#6B5848]">(Optional)</span>
        </label>
        <div
          className="mb-2.5 flex flex-wrap gap-2"
          role="group"
          aria-label="Quick cultural suggestions"
        >
          {[
            "Nikah",
            "Haldi",
            "Sangeet",
            "Diwali meetup",
            "Naming ceremony",
            "Mehndi",
          ].map((preset) => {
            const isPresetActive = cultureOrTradition === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setCultureOrTradition(preset);
                  if (errors.cultureOrTradition) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.cultureOrTradition;
                      return next;
                    });
                  }
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] ${
                  isPresetActive
                    ? "border-[#5B1A2B] bg-[#5B1A2B] text-[#FBF6EE]"
                    : "border-[#E8DCC8] bg-[#FFFDF8] text-[#2B1B14] hover:border-[#5B1A2B]"
                }`}
                aria-pressed={isPresetActive}
              >
                + {preset}
              </button>
            );
          })}
        </div>
        <input
          id="cultureOrTradition"
          type="text"
          value={cultureOrTradition}
          onChange={(e) => setCultureOrTradition(e.target.value)}
          placeholder="e.g., Nikah, Haldi, Sangeet, Diwali meetup, Naming ceremony"
          maxLength={200}
          className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          aria-describedby={
            errors.cultureOrTradition ? "cultureOrTradition-error" : undefined
          }
        />
        {errors.cultureOrTradition && (
          <p
            id="cultureOrTradition-error"
            className="mt-1.5 text-xs font-medium text-red-600"
            role="alert"
          >
            {errors.cultureOrTradition}
          </p>
        )}
      </div>

      {/* Venue Name & Dress Code (Optional) */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="venueName"
              className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
            >
              Venue Name{" "}
              <span className="font-normal text-[#6B5848]">(Optional)</span>
            </label>
            <span className="text-xs text-[#6B5848]">
              {venueName.length}/60
            </span>
          </div>
          <input
            id="venueName"
            type="text"
            value={venueName}
            onChange={(e) => {
              setVenueName(e.target.value);
              if (errors.venueName) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.venueName;
                  return next;
                });
              }
            }}
            placeholder="e.g., Grand Hyatt Ballroom, ITC Kohenur"
            maxLength={60}
            className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            aria-describedby={errors.venueName ? "venueName-error" : undefined}
          />
          {errors.venueName && (
            <p
              id="venueName-error"
              className="mt-1.5 text-xs font-medium text-red-600"
              role="alert"
            >
              {errors.venueName}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="dressCode"
              className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
            >
              Dress Code{" "}
              <span className="font-normal text-[#6B5848]">(Optional)</span>
            </label>
            <span className="text-xs text-[#6B5848]">
              {dressCode.length}/60
            </span>
          </div>
          <input
            id="dressCode"
            type="text"
            value={dressCode}
            onChange={(e) => {
              setDressCode(e.target.value);
              if (errors.dressCode) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.dressCode;
                  return next;
                });
              }
            }}
            placeholder="e.g., Royal Ethnic, Festive Cocktail, Black Tie"
            maxLength={60}
            className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
            aria-describedby={errors.dressCode ? "dressCode-error" : undefined}
          />
          {errors.dressCode && (
            <p
              id="dressCode-error"
              className="mt-1.5 text-xs font-medium text-red-600"
              role="alert"
            >
              {errors.dressCode}
            </p>
          )}
        </div>
      </div>

      {/* Special Requirements */}
      <div className="mb-6">
        <label
          htmlFor="specialRequirements"
          className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#2B1B14]"
        >
          Special Requirements{" "}
          <span className="font-normal text-[#6B5848]">(Optional)</span>
        </label>
        <textarea
          id="specialRequirements"
          value={specialRequirements}
          onChange={(e) => setSpecialRequirements(e.target.value)}
          placeholder="e.g., Wheelchair accessible venue, live band, vegetarian only"
          maxLength={500}
          rows={3}
          className="w-full rounded-xl border border-[#E8DCC8] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2B1B14] placeholder-[#6B5848] focus:border-[#5B1A2B] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          aria-describedby={
            errors.specialRequirements ? "specialRequirements-error" : undefined
          }
        />
        <p className="mt-1.5 text-xs text-[#6B5848]">
          {specialRequirements.length}/500 characters
        </p>
        {errors.specialRequirements && (
          <p
            id="specialRequirements-error"
            className="mt-1.5 text-xs font-medium text-red-600"
            role="alert"
          >
            {errors.specialRequirements}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="group relative flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#5B1A2B] px-6 py-3.5 text-base font-semibold text-[#FBF6EE] transition-all duration-300 hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-2"
      >
        <span className="sr-only">Generate event plan</span>
        <span aria-hidden="true">Generate plan</span>
        <span
          className="transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        >
          →
        </span>
      </button>
    </form>
  );
}
