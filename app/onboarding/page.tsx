import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/permissions";
import { createTeam, joinTeam, selectTeam } from "@/app/actions";
import { Submit } from "@/app/components/submit";
import { FormMessage } from "@/app/components/form-message";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const user = await requireUser();
  const memberships = await db.teamMember.findMany({ where: { userId: user.id }, include: { team: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
  const { message } = await searchParams;
  return <div className="shell page"><span className="eyebrow">YOUR TEAM CONNECTION</span><h1>Welcome, {user.name}</h1>
    <p className="lede">Create a team as its admin, or use the team code your coach gave you.</p><FormMessage code={message} />
    {memberships.length > 0 && <section className="panel"><h2>Your teams and requests</h2>{memberships.map(member => <div className="membership" key={member.id}>
      <h3>{member.team.name}</h3><p>{roleLabel(member.role)} · {member.status === "APPROVED" ? "Approved" : member.status === "PENDING" ? "Waiting for admin approval" : "Request declined or access removed"}</p>
      {member.status === "PENDING" && <p>Your request is saved. An admin must approve your role and player links before you can see team information. Refresh this page after approval.</p>}
      {member.status === "REJECTED" && <p>Contact your team admin. You can submit a new join request below.</p>}
      {member.status === "APPROVED" && <form action={selectTeam}><input type="hidden" name="memberId" value={member.id} /><Submit>Open this team</Submit></form>}
    </div>)}</section>}
    <div className="two-col"><form action={createTeam} className="panel form-stack"><h2>Create a team</h2><p>For the head coach or team organizer. You will be the team admin.</p>
      <label>Team name<input name="name" minLength={2} maxLength={100} required placeholder="Lady Sparks" /></label>
      <label>Age group<input name="ageGroup" maxLength={30} required placeholder="14U" /></label>
      <label>Season<input name="season" maxLength={50} required placeholder="Fall 2026" /></label><Submit>Create team</Submit>
    </form><form action={joinTeam} className="panel form-stack"><h2>Join a team</h2><p>Your admin will review this request before you get access.</p>
      <label>Team code<input name="code" minLength={8} maxLength={100} autoComplete="off" required /></label>
      <label>Your role<select name="role" defaultValue="PARENT"><option value="COACH">Coach</option><option value="PARENT">Parent</option><option value="PLAYER">Player</option></select></label>
      <label>Player name(s)<input name="playerRequest" maxLength={300} placeholder="Your name or your child’s name(s)" /><small>Required for parents and players. Your admin confirms the roster match.</small></label><Submit>Request to join</Submit>
    </form></div>
  </div>;
}
