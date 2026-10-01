"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Under13Disclosure({ teamId, initialValue, updatedAt }: {
  teamId: string; initialValue: boolean | null; updatedAt: string | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialValue === true);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/team-privacy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, containsUnder13Data: enabled })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this disclosure.");
      setSavedValue(data.containsUnder13Data); setSavedAt(data.under13DisclosureUpdatedAt);
      setMessage("Under-13 disclosure saved."); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not connect. Please try again.");
    } finally { setBusy(false); }
  }

  return <section className="panel">
    <h2>COPPA / Children under 13</h2>
    <form onSubmit={save} className="form-stack">
      <label className="check"><input type="checkbox" role="switch" checked={enabled} disabled={busy}
        aria-describedby="under13-disclosure-help"
        onChange={event => { setEnabled(event.target.checked); setMessage(""); setError(""); }} />
        This team will store information about children under 13 in Dugout2Home.
      </label>
      <p id="under13-disclosure-help">This setting records the team admin’s disclosure. It does not verify a parent’s consent or establish COPPA compliance. Where COPPA applies, required notices and verifiable parental consent must be handled separately.</p>
      <p><a href="https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business" target="_blank" rel="noopener noreferrer">Read the FTC’s COPPA guidance</a></p>
      <p>Saved disclosure: <strong>{savedValue === null ? "Not reviewed" : savedValue ? "Under-13 information indicated" : "Under-13 information not indicated"}</strong>{savedAt && <small> · Updated {savedAt.slice(0, 10)} (UTC)</small>}</p>
      {(savedValue === null || enabled !== savedValue) && <small>Click Save disclosure to apply your selection.</small>}
      <button type="submit" className="button primary" disabled={busy || (savedValue !== null && enabled === savedValue)}>{busy ? "Saving…" : "Save disclosure"}</button>
      {message && <p className="success" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  </section>;
}
