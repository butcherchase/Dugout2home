"use client";
import { useState } from "react";
export default function EmailDraft({ parents, initialBody, playerName, teamName }: { parents: { email: string; name: string | null }[]; initialBody: string; playerName: string; teamName: string }) {
  const [to, setTo] = useState(parents[0]?.email ?? ""), [subject, setSubject] = useState(`${teamName}: ${playerName}'s development update`), [body, setBody] = useState(initialBody), [message, setMessage] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return <section className="panel form-stack"><h2>Review parent email</h2><p>Edit the draft, replace bracketed coach prompts, and confirm the recipient. Opening a draft does not send it; finish in your email app.</p>
    {!!parents.length && <label>Approved linked parents<select value={parents.some(p => p.email === to) ? to : ""} onChange={e => { setTo(e.target.value); setReviewed(false); }}><option value="">Enter a parent email below</option>{parents.map(p => <option key={p.email} value={p.email}>{p.name || p.email} · {p.email}</option>)}</select></label>}
    {!parents.length && <p>No approved parent accounts are linked to this player yet. You can enter a parent’s address or connect their account in Team settings.</p>}
    <label>Recipient email<input type="email" value={to} onChange={e => { setTo(e.target.value); setReviewed(false); }} maxLength={254} /></label><label>Subject<input value={subject} onChange={e => { setSubject(e.target.value); setReviewed(false); }} maxLength={160} /></label><label>Message<textarea rows={24} value={body} onChange={e => { setBody(e.target.value); setReviewed(false); }} maxLength={12000} /></label>
    <label className="check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I reviewed the recipient and this player’s feedback.</label>
    <div className="actions"><button className="button primary" disabled={!reviewed || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to) || !subject.trim() || !body.trim()} onClick={() => { window.location.href = mailto; setMessage("Email draft requested. If your email app does not open or truncates the message, use Copy message."); }}>Open email draft</button><button className="button secondary" onClick={async () => { try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); setMessage("Message copied."); } catch { setMessage("Copy was unavailable. Select the message text and copy it manually."); } }}>Copy message</button></div><p role="status">{message}</p>
  </section>;
}
