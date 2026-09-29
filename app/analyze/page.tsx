import { requireCoach } from "@/lib/auth";
import AnalyzeClient from "./analyze-client";
export default async function AnalyzePage() {
  const member = await requireCoach();
  return <AnalyzeClient teamName={member.team.name} />;
}
