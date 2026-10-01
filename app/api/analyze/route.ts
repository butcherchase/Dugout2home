import { createHash } from "node:crypto";
import { coachApiAccess } from "@/lib/auth";
import { NextResponse } from "next/server";
import { analyzeScorebook } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const access = await coachApiAccess(request);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const file = form.get("scorebook");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Upload a scorebook image, PDF, or CSV." },
        { status: 400 }
      );
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    const isCsv =
      file.type === "text/csv" ||
      file.name.toLowerCase().endsWith(".csv");

    if (!isImage && !isPdf && !isCsv) {
      return NextResponse.json(
        {
          error:
            "Upload a JPG, PNG, PDF, or GameChanger CSV file."
        },
        { status: 400 }
      );
    }

    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Scorebook file must be 12 MB or smaller." },
        { status: 400 }
      );
    }

    if (isCsv && form.get("csvScope") !== "single_game") {
      return NextResponse.json({ error: "This analyzer saves one game at a time. Cumulative season/tournament CSV totals cannot be saved as an individual game. Use that game’s scorebook or a confirmed single-game CSV." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    let analysis;

    if (isCsv) {
      analysis = await analyzeScorebook({
        kind: "csv",
        data: bytes.toString("utf8"),
        filename: file.name || "gamechanger.csv"
      }, access.member.team.name);
    } else if (isPdf) {
      analysis = await analyzeScorebook({
        kind: "pdf",
        data: bytes.toString("base64"),
        filename: file.name || "scorebook.pdf"
      }, access.member.team.name);
    } else {
      analysis = await analyzeScorebook({
        kind: "image",
        data: `data:${file.type};base64,${bytes.toString("base64")}`
      }, access.member.team.name);
    }

    return NextResponse.json({ analysis, teamId: access.member.teamId, sourceHash: createHash("sha256").update(bytes).digest("hex") });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Scorebook analysis failed. Try a clearer image, PDF, or CSV."
      },
      { status: 500 }
    );
  }
}