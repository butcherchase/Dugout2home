import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  if (await currentUser()) redirect("/dashboard");
  return <div className="shell"><section className="hero"><div><span className="eyebrow">COACH DEVELOPMENT SYSTEM</span><h1>Turn every game into a <em>development plan.</em></h1><p>Connect scorebook analysis, player development, and practice planning with the people on your team.</p><div className="actions"><Link href="/signup" className="button primary">Create your account</Link><Link href="/login" className="button secondary">Sign in</Link></div></div><div className="hero-card"><h2>A place for every role</h2><p>Coaches analyze and guide. Parents and players follow their own development story. Team admins approve who gets access.</p></div></section></div>;
}
