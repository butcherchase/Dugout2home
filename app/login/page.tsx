import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { login } from "@/app/actions";
import { Submit } from "@/app/components/submit";
import { FormMessage } from "@/app/components/form-message";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  if (await currentUser()) redirect("/dashboard");
  const { message } = await searchParams;
  return <div className="shell auth-shell"><span className="eyebrow">WELCOME BACK</span><h1>Sign in</h1>
    <p>Your team, your players, your next step.</p><FormMessage code={message} />
    <form action={login} className="panel form-stack">
      <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" minLength={12} maxLength={128} required /></label>
      <Submit>Sign in</Submit>
    </form><p>New here? <Link href="/signup">Create an account</Link></p>
  </div>;
}
