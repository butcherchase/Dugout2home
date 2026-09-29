import { NextResponse } from "next/server";
import { analyzeScorebook } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
    }

    const form = await request.formData();
    const file = form.get("scorebook");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a scorebook image." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "MVP currently accepts image uploads. PDF support is next." }, { status: 400 });
    }

    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be 12 MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
    const analysis = await analyzeScorebook(dataUrl);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Scorebook analysis failed. Try a clearer image." }, { status: 500 });
  }
}
