import { NextRequest, NextResponse } from "next/server";
import { eventInputSchema } from "@/lib/schemas";
import { generateEventPlan, checkRateLimit } from "@/lib/ai";
import { generateCacheKey } from "@/lib/utils";
import { generateFallbackPlan } from "@/lib/fallback";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting using client IP (sanitize forwarded headers)
    const forwarded = request.headers.get("x-forwarded-for");
    const clientId =
      (forwarded ? forwarded.split(",")[0].trim() : null) ??
      request.headers.get("x-real-ip") ??
      "anonymous";

    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    // Parse and validate input
    const body: unknown = await request.json();
    const result = eventInputSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json(
        { error: "Invalid input", details: errors },
        { status: 400 }
      );
    }

    const input = result.data;
    const cacheKey = generateCacheKey(input);

    try {
      const plan = await generateEventPlan(input, cacheKey);
      return NextResponse.json({ plan });
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
      return NextResponse.json({ plan: fallback });
    }
  } catch (error) {
    console.error("API /api/generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate event plan. Please try again." },
      { status: 500 }
    );
  }
}
