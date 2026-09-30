export type DevelopmentArea =
  | "hitting"
  | "baserunning"
  | "defense"
  | "throwing"
  | "pitching"
  | "situational_awareness";

export type ScorebookEvent = {
  inning: number;
  half: "top" | "bottom" | "unknown";
  player: string;
  event: string;
  result: string;
  confidence: number;
};

export type PlayerGameSummary = {
  player: string;
  plateAppearances: number;
  hits: number;
  walks: number;
  strikeouts: number;
  runs: number;
  rbi: number;
  notes: string[];
  details?: import("@/lib/player-details").PlayerDetails;
};

export type DevelopmentPriority = {
  area: DevelopmentArea;
  level: "high" | "medium" | "low";
  evidence: string;
  recommendation: string;
};

export type GameAnalysis = {
  opponent: string;
  gameDate: string;
  score: { us: number; them: number };
  confidence: number;
  summary: string;
  excelledAt: string[];
  workOn: string[];
  events: ScorebookEvent[];
  playerSummaries: PlayerGameSummary[];
  priorities: DevelopmentPriority[];
};

export type PracticeBlock = {
  minutes: number;
  title: string;
  purpose: string;
  setup: string;
};

export type PracticePlan = {
  title: string;
  durationMinutes: number;
  focus: string[];
  blocks: PracticeBlock[];
  coachNotes: string[];
};
