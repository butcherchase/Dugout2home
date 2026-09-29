"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="shell"><section className="panel"><h1>We couldn’t load this page</h1><p>Please try again. If the problem continues, contact your team admin.</p><button className="button primary" onClick={reset}>Try again</button></section></div>;
}
