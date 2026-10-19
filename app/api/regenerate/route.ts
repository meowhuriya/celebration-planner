import { NextRequest, NextResponse } from "next/server";
import { regenerateRequestSchema } from "@/lib/schemas";
import { regenerateSection, checkRateLimit } from "@/lib/ai";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    const body: unknown = await request.json();
    const result = regenerateRequestSchema.safeParse(body);

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

    const { section, eventInput } = result.data;
    const sectionData = await regenerateSection(section, eventInput);

    return NextResponse.json({ section: sectionData });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("GEMINI_API_KEY")
        ? "Server configuration error. Please contact the administrator."
        : "Failed to regenerate section. Please try again.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
