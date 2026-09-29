import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPracticePlan } from "@/lib/ai";

const requestSchema = z.object({
  priorities: z.array(z.object({
    area: z.enum(["hitting", "baserunning", "defense", "throwing", "pitching", "situational_awareness"]),
    level: z.enum(["high", "medium", "low"]),
    evidence: z.string(),
    recommendation: z.string()
  })),
  durationMinutes: z.number().int().min(30).max(180).default(75),
  ageGroup: z.string().optional()
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
    }

    const input = requestSchema.parse(await request.json());
    const plan = await buildPracticePlan(input);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not build the practice plan." }, { status: 400 });
  }
}
