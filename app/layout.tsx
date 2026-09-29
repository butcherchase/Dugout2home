import type { Metadata } from "next";
import Link from "next/link";
import { currentUser, currentMembership } from "@/lib/auth";
import { isCoach } from "@/lib/permissions";
import { logout } from "@/app/actions";
import "./globals.css";

export const metadata: Metadata = { title: "Dugout2Home", description: "Turn every game into a development plan." };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  const member = user ? await currentMembership() : null;
  const approved = member?.status === "APPROVED";
  return <html lang="en"><body><header className="topbar"><Link href="/" className="brand">Dugout<span>2</span>Home</Link><nav aria-label="Main navigation">
    {approved && isCoach(member.role) && <><Link href="/dashboard">Dashboard</Link><Link href="/analyze">Scorebook</Link><Link href="/players">Players</Link><Link href="/practice">Practice</Link><Link href="/recaps">Recaps</Link></>}
    {approved && !isCoach(member.role) && <Link href="/my-player">My development</Link>}
    {approved && member.role === "TEAM_ADMIN" && <Link href="/team">Team settings</Link>}
    {user ? <><Link href="/onboarding">My teams</Link><form action={logout}><button className="nav-button">Sign out</button></form></> : <><Link href="/login">Sign in</Link><Link href="/signup">Join</Link></>}
  </nav></header><main>{children}</main></body></html>;
}
