"use client";

import { useEffect, useState } from "react";
import type { Guest } from "@/lib/seating";
import type { EventEssentials } from "@/lib/rsvp/types";
import { encodeInvitePayload } from "@/lib/rsvp/payload";
import { generateQrDataUrl } from "@/lib/rsvp/qr";

interface PrintInvitesViewProps {
  guests: Guest[];
  eventEssentials: EventEssentials;
  siteUrl: string;
}

interface PrintCardItem {
  guest: Guest;
  qrDataUrl: string;
}

export default function PrintInvitesView({
  guests,
  eventEssentials,
  siteUrl,
}: PrintInvitesViewProps) {
  const [cards, setCards] = useState<PrintCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function prepareCards() {
      setLoading(true);
      const items: PrintCardItem[] = [];

      for (const guest of guests) {
        try {
          const hash = await encodeInvitePayload({
            v: 1,
            e: eventEssentials,
            g: {
              id: guest.id,
              n: guest.name,
              grp: guest.group,
            },
          });
          const fullUrl = `${siteUrl}/i#${hash}`;
          const qrDataUrl = await generateQrDataUrl(fullUrl, 5, 1);
          items.push({ guest, qrDataUrl });
        } catch (err) {
          console.error(
            "Failed to generate print card for guest",
            guest.name,
            err
          );
        }
      }

      if (isMounted) {
        setCards(items);
        setLoading(false);
      }
    }

    if (guests.length > 0) {
      prepareCards();
    } else {
      setCards([]);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [guests, eventEssentials, siteUrl]);

  if (loading || cards.length === 0) {
    return null;
  }

  return (
    <div className="hidden print:block print:w-full">
      <div className="print-invites-grid grid grid-cols-2 gap-4">
        {cards.map((item, index) => {
          const isPageBreak =
            (index + 1) % 4 === 0 && index !== cards.length - 1;

          return (
            <div
              key={item.guest.id}
              className={`invite-print-card relative flex h-[5.2in] break-inside-avoid flex-col justify-between rounded-2xl border-2 border-stone-800 bg-white p-5 text-stone-900 shadow-none ${
                isPageBreak ? "break-after-page" : ""
              }`}
            >
              {/* Header */}
              <div>
                <div className="mb-3 flex items-center justify-between border-b border-stone-300 pb-2">
                  <span className="font-serif text-sm font-semibold uppercase tracking-wider text-stone-700">
                    Celebration Invitation
                  </span>
                  {item.guest.group && (
                    <span className="text-[10px] font-medium uppercase tracking-widest text-stone-500">
                      {item.guest.group}
                    </span>
                  )}
                </div>

                <h3 className="mb-1 font-serif text-2xl font-normal leading-tight text-stone-900">
                  Dear {item.guest.name},
                </h3>

                <p className="mb-2 text-xs text-stone-600">
                  {eventEssentials.h
                    ? `${eventEssentials.h} warmly invites you to celebrate`
                    : "You are warmly invited to celebrate"}
                </p>

                <p className="font-serif text-lg font-normal text-stone-800">
                  {eventEssentials.t.charAt(0).toUpperCase() +
                    eventEssentials.t.slice(1)}
                  {eventEssentials.th ? ` · ${eventEssentials.th}` : ""}
                </p>

                <div className="mt-2 space-y-0.5 text-xs text-stone-700">
                  {eventEssentials.d && (
                    <p className="font-semibold">
                      📅 Date:{" "}
                      {new Date(eventEssentials.d).toLocaleDateString("en-IN", {
                        weekday: "short",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                  {eventEssentials.v && <p>🏛️ Venue: {eventEssentials.v}</p>}
                  {eventEssentials.c && <p>📍 Location: {eventEssentials.c}</p>}
                  {eventEssentials.dc && (
                    <p>👔 Dress code: {eventEssentials.dc}</p>
                  )}
                </div>
              </div>

              {/* QR and RSVP instructions */}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-stone-300 pt-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                    Scan to RSVP
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-stone-600">
                    Open your camera to view the full interactive invite and
                    send your reply.
                  </p>
                </div>

                {item.qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.qrDataUrl}
                    alt={`QR code for ${item.guest.name}'s invitation`}
                    className="h-28 w-28 rounded-lg border border-stone-300 object-contain p-1"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
