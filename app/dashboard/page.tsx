import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { isCoach, roleLabel } from "@/lib/permissions";

export default async function DashboardPage() {
  const member = await requireMember();
  if (!isCoach(member.role)) redirect("/my-player");
  return <div className="shell page"><span className="eyebrow">{roleLabel(member.role)}</span><h1>{member.team.name}</h1>
    <p className="lede">{member.team.ageGroup} · {member.team.season}</p><p>Your scorebook analysis uses this team as “us.” <Link href="/onboarding">Change team</Link></p>
    <section className="module-grid">
      <Link href="/analyze" className="module"><h3>Scorebook Analyzer</h3><p>Analyze a photo, PDF, or GameChanger CSV for your team.</p></Link>
      <Link href="/players" className="module"><h3>Player Development</h3><p>View the team roster and choose which feedback families can see.</p></Link>
      <Link href="/practice" className="module"><h3>Practice Planner</h3><p>See an example plan. Generate a game-based plan from the analyzer.</p></Link>
      <Link href="/recaps" className="module"><h3>Game & Tournament Recaps</h3><p>Preview the recap format.</p></Link>
    </section>{member.role === "TEAM_ADMIN" && <Link href="/team" className="button primary">Manage roster and approvals</Link>}
  </div>;
}
