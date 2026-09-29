import OpenAI from "openai";
import type { GameAnalysis, PracticePlan } from "@/types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-6-astra";

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    opponent: { type: "string" },
    gameDate: { type: "string" },
    score: {
      type: "object",
      additionalProperties: false,
      properties: { us: { type: "integer" }, them: { type: "integer" } },
      required: ["us", "them"]
    },
    confidence: { type: "number" },
    summary: { type: "string" },
    excelledAt: { type: "array", items: { type: "string" } },
    workOn: { type: "array", items: { type: "string" } },
    events: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          inning: { type: "integer" },
          half: { type: "string", enum: ["top", "bottom", "unknown"] },
          player: { type: "string" },
          event: { type: "string" },
          result: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["inning", "half", "player", "event", "result", "confidence"]
      }
    },
    playerSummaries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          player: { type: "string" },
          plateAppearances: { type: "integer" },
          hits: { type: "integer" },
          walks: { type: "integer" },
          strikeouts: { type: "integer" },
          runs: { type: "integer" },
          rbi: { type: "integer" },
          notes: { type: "array", items: { type: "string" } }
        },
        required: ["player", "plateAppearances", "hits", "walks", "strikeouts", "runs", "rbi", "notes"]
      }
    },
    priorities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          area: { type: "string", enum: ["hitting", "baserunning", "defense", "throwing", "pitching", "situational_awareness"] },
          level: { type: "string", enum: ["high", "medium", "low"] },
          evidence: { type: "string" },
          recommendation: { type: "string" }
        },
        required: ["area", "level", "evidence", "recommendation"]
      }
    }
  },
  required: ["opponent", "gameDate", "score", "confidence", "summary", "excelledAt", "workOn", "events", "playerSummaries", "priorities"]
} as const;

const practiceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    durationMinutes: { type: "integer" },
    focus: { type: "array", items: { type: "string" } },
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          minutes: { type: "integer" },
          title: { type: "string" },
          purpose: { type: "string" },
          setup: { type: "string" }
        },
        required: ["minutes", "title", "purpose", "setup"]
      }
    },
    coachNotes: { type: "array", items: { type: "string" } }
  },
  required: ["title", "durationMinutes", "focus", "blocks", "coachNotes"]
} as const;

export async function analyzeScorebook(dataUrl: string): Promise<GameAnalysis> {
  const response = await client.responses.create({
    model,
    input: [{
      role: "user",
      content: [
        {
          type ScorebookInput =
  | { kind: "image"; data: string }
  | { kind: "pdf"; data: string; filename: string };

export async function analyzeScorebook(input: ScorebookInput): Promise<GameAnalysis> {
  const source =
    input.kind === "pdf"
      ? {
          type: "input_file" as const,
          file_data: input.data,
          filename: input.filename
        }
      : {
          type: "input_image" as const,
          image_url: input.data,
          detail: "auto" as const
        };

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `You are the Dugout2Home softball scorebook analyst. Analyze this scorebook conservatively. Do not invent unreadable events. Use confidence scores. Extract game events and player summaries, then identify development priorities. Separate what the team excelled at from what should be practiced next. If opponent/date/score cannot be read, use "Unknown" or 0 and reduce confidence.`
          },
          source
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "scorebook_analysis",
        strict: true,
        schema: analysisSchema
      }
    }
  });

  return JSON.parse(response.output_text) as GameAnalysis;
}

export async function buildPracticePlan(input: {
  priorities: GameAnalysis["priorities"];
  durationMinutes: number;
  ageGroup?: string;
}): Promise<PracticePlan> {
  const response = await client.responses.create({
    model,
    input: `Create a softball practice plan for ${input.ageGroup || "youth softball"}. Total time must be ${input.durationMinutes} minutes. Use these evidence-based priorities from the team's latest game analysis:\n${JSON.stringify(input.priorities)}\nMake the plan practical for multiple coaches and stations. Prioritize the highest-need areas without ignoring warmup/throwing fundamentals.`,
    text: {
      format: {
        type: "json_schema",
        name: "practice_plan",
        strict: true,
        schema: practiceSchema
      }
    }
  });

  return JSON.parse(response.output_text) as PracticePlan;
}
