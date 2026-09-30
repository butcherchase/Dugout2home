import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { isCoach, roleLabel } from "@/lib/permissions";

export default async function DashboardPage() {
  const member = await requireMember();
  if (!isCoach(member.role)) redirect("/my-player");
  return <div className="shell page"><span className="eyebrow">{roleLabel(member.role)}</span><h1>{member.team.name}</h1>
    <p className="lede">{member.team.ageGroup} · {member.team.season}</p><p>Your scorebook analysis uses this team as “us.” <Link href="/onboarding">Change team</Link></p>
    <section className="dashboard-flow" aria-label="Upload and save a scorebook to update player development, practice priorities, and recaps">
      <Link href="/analyze" className="module flow-source"><span>START HERE</span><h3>Scorebook Analyzer</h3><p>Upload a scorebook. Review and save the game.</p><b>Analyze a game →</b></Link>
      <p className="flow-caption">One saved game connects to all three</p>
      <div className="flow-destinations">
        <div className="flow-branch"><span className="flow-arrow" aria-hidden="true">↓</span><Link href="/players" className="module"><h3>Player Development</h3><p>Matched player results, game totals, and development evidence.</p><b>View players →</b></Link></div>
        <div className="flow-branch"><span className="flow-arrow" aria-hidden="true">↓</span><Link href="/practice" className="module"><h3>Practice Planner</h3><p>Turn saved game or tournament priorities into the next practice.</p><b>Plan practice →</b></Link></div>
        <div className="flow-branch"><span className="flow-arrow" aria-hidden="true">↓</span><Link href="/recaps" className="module"><h3>Game & Tournament Recaps</h3><p>Find every saved game and see the whole tournament.</p><b>Open game log →</b></Link></div>
      </div>
    </section>{member.role === "TEAM_ADMIN" && <Link href="/team" className="button primary">Manage roster and approvals</Link>}
  </div>;
}
