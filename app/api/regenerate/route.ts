import { NextRequest, NextResponse } from "next/server";
import { regenerateRequestSchema } from "@/lib/schemas";
import { regenerateSection, checkRateLimit } from "@/lib/ai";

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
    const result = regenerateRequestSchema.safeParse(body);

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

    const { section, eventInput } = result.data;
    const sectionData = await regenerateSection(section, eventInput);

    return NextResponse.json(
      { section: sectionData },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("GEMINI_API_KEY")
        ? "Server configuration error. Please contact the administrator."
        : "Failed to regenerate section. Please try again.";

    return NextResponse.json(
      { error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
