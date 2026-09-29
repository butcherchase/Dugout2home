import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { signup } from "@/app/actions";
import { Submit } from "@/app/components/submit";
import { FormMessage } from "@/app/components/form-message";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  if (await currentUser()) redirect("/onboarding");
  const { message } = await searchParams;
  return <div className="shell auth-shell"><span className="eyebrow">START YOUR DEVELOPMENT STORY</span><h1>Create your account</h1>
    <p>Next, create a team or request to join your coach’s team.</p><FormMessage code={message} />
    <form action={signup} className="panel form-stack">
      <label>Your name<input name="name" autoComplete="name" maxLength={100} required /></label>
      <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><small>Use at least 12 characters. Keep this password in a safe place.</small></label>
      <Submit>Create account</Submit>
    </form><p>Already registered? <Link href="/login">Sign in</Link></p>
  </div>;
}
