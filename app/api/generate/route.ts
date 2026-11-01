import { NextRequest, NextResponse } from "next/server";
import { eventInputSchema } from "@/lib/schemas";
import { generateEventPlan, checkRateLimit } from "@/lib/ai";
import { generateCacheKey } from "@/lib/utils";
import { generateFallbackPlan } from "@/lib/fallback";

const MAX_PAYLOAD_BYTES = 16_384; // 16KB payload size guard

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Payload Size Guard (Check Content-Length header)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Maximum allowed size is 16KB." },
        { status: 413, headers: NO_CACHE_HEADERS }
      );
    }

    // Rate limiting using client IP (sanitize forwarded headers)
    const forwarded = request.headers.get("x-forwarded-for");
    const clientId =
      (forwarded ? forwarded.split(",")[0].trim() : null) ??
      request.headers.get("x-real-ip") ??
      "anonymous";

    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
            ...NO_CACHE_HEADERS,
          },
        }
      );
    }

    // 2. Parse and validate input (check raw body length)
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Maximum allowed size is 16KB." },
        { status: 413, headers: NO_CACHE_HEADERS }
      );
    }

    const body: unknown = JSON.parse(rawBody);
    const result = eventInputSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json(
        { error: "Invalid input", details: errors },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const input = result.data;
    const cacheKey = generateCacheKey(input);

    try {
      const plan = await generateEventPlan(input, cacheKey);
      return NextResponse.json({ plan }, { headers: NO_CACHE_HEADERS });
    } catch (aiError) {
      console.warn(
        "AI generation failed after retry; returning fallback:",
        aiError
      );
      const fallback = generateFallbackPlan(input);
      fallback.isFallback = true;
      fallback.fallbackReason =
        aiError instanceof Error
          ? aiError.message
          : "Live AI service unavailable";
      return NextResponse.json(
        { plan: fallback },
        { headers: NO_CACHE_HEADERS }
      );
    }
  } catch (error) {
    console.error("API /api/generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate event plan. Please try again." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
