import { NextResponse } from "next/server";
import { analyzeScorebook } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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

    const bytes = Buffer.from(await file.arrayBuffer());

    let analysis;

    if (isCsv) {
      analysis = await analyzeScorebook({
        kind: "csv",
        data: bytes.toString("utf8"),
        filename: file.name || "gamechanger.csv"
      });
    } else if (isPdf) {
      analysis = await analyzeScorebook({
        kind: "pdf",
        data: bytes.toString("base64"),
        filename: file.name || "scorebook.pdf"
      });
    } else {
      analysis = await analyzeScorebook({
        kind: "image",
        data: `data:${file.type};base64,${bytes.toString("base64")}`
      });
    }

    return NextResponse.json({ analysis });
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