import Under13Disclosure from "./under13-disclosure";
import Link from "next/link";
import LogoUpload from "./logo-upload";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/permissions";
import { addPlayer, reviewMember, rotateCode } from "@/app/actions";
import { Submit } from "@/app/components/submit";
import { FormMessage } from "@/app/components/form-message";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const admin = await requireAdmin();
  const [members, players] = await Promise.all([
    db.teamMember.findMany({ where: { teamId: admin.teamId }, include: { user: { select: { name: true, email: true } }, playerLinks: { include: { player: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: "asc" } }),
    db.player.findMany({ where: { teamId: admin.teamId, active: true }, orderBy: { firstName: "asc" } })
  ]);
  const pending = members.filter(m => m.status === "PENDING");
  const { message } = await searchParams;
  return <div className="shell page"><span className="eyebrow">TEAM ADMIN</span><h1>{admin.team.name}</h1><FormMessage code={message} />
    <Under13Disclosure key={admin.teamId} teamId={admin.teamId} initialValue={admin.team.containsUnder13Data} updatedAt={admin.team.under13DisclosureUpdatedAt?.toISOString() ?? null} />
    <LogoUpload teamId={admin.teamId} currentLogo={admin.team.logoData} />
    <section className="panel"><h2>Build your roster from a scorebook</h2><p>Upload your first game, mark extracted players for roster creation, and review their names before saving.</p><Link className="button secondary" href="/analyze">Upload scorebook to build roster</Link></section>
    <section className="panel"><h2>Invite your team</h2><p>Share this code with coaches, parents, and players. A code allows requests; you still approve each person.</p>
      <p className="join-code">{admin.team.joinCode}</p><form action={rotateCode}><Submit>Replace invite code</Submit></form><small>Replacing the code stops new requests using the old code. Existing memberships stay intact.</small>
    </section>
    <section className="panel"><h2>Pending approvals ({pending.length})</h2><p>Confirm each person’s identity and role. For parents and players, select the matching roster entries before approving.</p>
      {!pending.length && <p>No pending requests.</p>}
      {pending.map(member => <form action={reviewMember} className="membership form-stack" key={member.id}>
        <input type="hidden" name="memberId" value={member.id} /><h3>{member.user.name} · {member.user.email}</h3>
        <p>Requested: {roleLabel(member.role)}. Player names: {member.playerRequest || "None"}</p>
        <label>Approve as<select name="role" defaultValue={member.role}><option value="COACH">Coach</option><option value="PARENT">Parent</option><option value="PLAYER">Player</option></select></label>
        <fieldset><legend>Linked players</legend><p>Choose exactly one for a player, one or more for a parent, and none for a coach.</p>
          {!players.length && <p>Add roster players below first.</p>}
          {players.map(player => <label className="check" key={player.id}><input type="checkbox" name="playerIds" value={player.id} />{player.firstName} {player.lastName} {player.jersey && `#${player.jersey}`}</label>)}
        </fieldset><div className="actions"><button className="button primary" name="decision" value="approve">Approve</button><button className="button secondary" name="decision" value="reject">Decline</button></div>
      </form>)}
    </section>
    <div className="two-col"><form action={addPlayer} className="panel form-stack"><h2>Add roster player</h2>
      <label>First name<input name="firstName" maxLength={60} required /></label><label>Last name<input name="lastName" maxLength={60} /></label><label>Jersey number<input name="jersey" maxLength={10} /></label><Submit>Add player</Submit>
    </form><section className="panel"><h2>Roster</h2>{!players.length && <p>No players added yet.</p>}{players.map(p => <p key={p.id}>{p.firstName} {p.lastName} {p.jersey && `#${p.jersey}`}</p>)}</section></div>
    <section className="panel"><h2>Team members</h2>{members.filter(m => m.status !== "PENDING").map(member => <div className="membership" key={member.id}>
      <h3>{member.user.name} · {roleLabel(member.role)}</h3><p>{member.user.email} · {member.status}</p><p>{member.playerLinks.map(l => `${l.player.firstName} ${l.player.lastName ?? ""}`).join(", ")}</p>
      {member.status === "APPROVED" && member.role !== "TEAM_ADMIN" && <form action={reviewMember}><input type="hidden" name="memberId" value={member.id} /><input type="hidden" name="decision" value="revoke" /><Submit>Remove team access</Submit></form>}
    </div>)}</section>
  </div>;
}
