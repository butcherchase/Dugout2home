"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function LogoUpload({ teamId, currentLogo }: { teamId: string; currentLogo: string | null }) {
  const router = useRouter();
  const [preview, setPreview] = useState(currentLogo), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function choose(file?: File) {
    if (!file) return;
    setMessage(""); setBusy(true);
    let url = "";
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Choose a PNG, JPG, or WebP under 5 MB.");
      url = URL.createObjectURL(file);
      const img = new Image(); img.src = url; await img.decode();
      const scale = Math.min(1, 512 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/png");
      if (data.length > 680000) throw new Error("This image is too detailed. Choose a smaller logo.");
      setPreview(data); setMessage("Preview ready. Click Save logo to apply it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not open image."); }
    finally { if (url) URL.revokeObjectURL(url); setBusy(false); }
  }
  async function save(logoData: string | null) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/team-logo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId, logoData }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setPreview(logoData); setMessage(logoData ? "Team logo saved." : "Team logo removed."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save logo."); }
    finally { setBusy(false); }
  }
  return <section className="panel form-stack"><h2>Team logo</h2><p>Your logo appears in the app header and on shareable recap images.</p>{preview && <img src={preview} className="logo-preview" alt="Team logo preview" />}<label>Choose a logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => choose(e.target.files?.[0])} /></label><div className="actions"><button className="button primary" disabled={busy || !preview} onClick={() => save(preview)}>Save logo</button><button className="button secondary" disabled={busy || !currentLogo} onClick={() => save(null)}>Remove logo</button></div><p role="status">{message}</p></section>;
}
