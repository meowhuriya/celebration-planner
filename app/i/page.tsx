"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { InvitePayload } from "@/lib/rsvp/types";
import { decodeInvitePayload } from "@/lib/rsvp/payload";
import GuestEnvelope from "@/components/rsvp/GuestEnvelope";

export default function GuestInvitePage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [payload, setPayload] = useState<InvitePayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function parseHash() {
      if (typeof window === "undefined") return;

      const rawHash = window.location.hash;
      if (!rawHash || rawHash === "#") {
        setStatus("error");
        setErrorMessage("No invitation code found in link.");
        return;
      }

      try {
        const decoded = await decodeInvitePayload(rawHash);
        if (!decoded) {
          setStatus("error");
          setErrorMessage(
            "This invitation link appears to be invalid, tampered, or expired. Please check with your host."
          );
          return;
        }

        setPayload(decoded);
        setStatus("ready");
      } catch (err) {
        console.error("Error decoding invite hash:", err);
        setStatus("error");
        setErrorMessage(
          "We could not open this invitation link. Please request a fresh invite link from your host."
        );
      }
    }

    parseHash();

    // Listen for hash changes if user pastes a new one
    window.addEventListener("hashchange", parseHash);
    return () => window.removeEventListener("hashchange", parseHash);
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF6EE] text-[#2B1B14] antialiased">
      {/* Minimal Top Brand Bar */}
      <header className="border-b border-[#E8DCC8] bg-[#FBF6EE]/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-1 text-[#2B1B14] transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#5B1A2B] font-serif text-lg italic text-[#FBF6EE]">
              C
            </span>
            <span className="font-serif text-lg tracking-tight">Celebrate</span>
          </Link>

          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B5848]">
            Digital Invitation
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center space-y-3 py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8DCC8] border-t-[#5B1A2B]" />
            <p className="text-xs text-[#6B5848]">Loading your invitation...</p>
          </div>
        )}

        {status === "error" && (
          <div className="animate-in fade-in mx-auto max-w-md space-y-4 rounded-3xl border border-[#E8DCC8] bg-[#FFFDF8] p-8 text-center shadow-sm duration-300">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#5B1A2B]/10 text-xl text-[#5B1A2B]">
              ⚠️
            </div>

            <h1 className="font-serif text-2xl font-normal text-[#2B1B14]">
              Invitation Unavailable
            </h1>

            <p className="text-xs leading-relaxed text-[#6B5848]">
              {errorMessage}
            </p>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-[#5B1A2B] px-5 py-2.5 text-xs font-semibold text-[#FBF6EE] transition-colors hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B]"
              >
                Go to Celebrate Home
              </Link>
            </div>
          </div>
        )}

        {status === "ready" && payload && <GuestEnvelope payload={payload} />}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#E8DCC8] py-8 text-center text-xs text-[#6B5848]">
        <p>Celebrate — Event planning, made easy</p>
      </footer>
    </div>
  );
}
