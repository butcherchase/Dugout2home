"use client";
import { useEffect, useRef, useState } from "react";
export default function ShareRecap({ teamName, logoData, title, score, initialCaption }: { teamName: string; logoData: string | null; title: string; score: string; initialCaption: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [caption, setCaption] = useState(initialCaption), [headline, setHeadline] = useState(title), [highlight, setHighlight] = useState("Growing together, one game at a time.");
  const [blob, setBlob] = useState<Blob | null>(null), [message, setMessage] = useState("");
  useEffect(() => {
    let canceled = false; setBlob(null);
    async function draw() {
      const context = canvas.current?.getContext("2d"); if (!context) return;
      const ctx: CanvasRenderingContext2D = context;
      let logo: HTMLImageElement | null = null;
      if (logoData) { logo = new Image(); logo.src = logoData; try { await logo.decode(); } catch { logo = null; } }
      if (canceled) return;
      ctx.fillStyle = "#0a0d12"; ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = "#172338"; ctx.fillRect(40, 40, 1000, 1000);
      ctx.fillStyle = "#ff4d4d"; ctx.fillRect(40, 40, 1000, 12);
      if (logo) { const factor = Math.min(170 / logo.width, 170 / logo.height); ctx.drawImage(logo, (1080 - logo.width * factor) / 2, 90, logo.width * factor, logo.height * factor); }
      ctx.textAlign = "center";
      function text(value: string, y: number, size: number, color: string, maxLines: number) {
        ctx.font = `bold ${size}px Arial`; ctx.fillStyle = color;
        const words = value.replace(/\s+/g, " ").trim().split(" "), lines: string[] = []; let line = "";
        for (const word of words) {
          if (ctx.measureText(line + " " + word).width > 880 && line) { lines.push(line); line = word; } else line += (line ? " " : "") + word;
        }
        if (line) lines.push(line);
        const shown = lines.slice(0, maxLines);
        shown.forEach((l, i) => {
          if (i === maxLines - 1 && lines.length > maxLines) l += "…";
          while (ctx.measureText(l).width > 880 && l.length > 1) l = l.slice(0, -2) + "…";
          ctx.fillText(l, 540, y + i * size * 1.25);
        });
      }
      text(teamName, 325, 46, "#ffffff", 2);
      text(headline, 490, 42, "#a7c0ff", 2);
      text(score, 690, 76, "#ffffff", 2);
      text(highlight, 890, 29, "#c5d0df", 2);
      text("DUGOUT2HOME • GAME RECAP", 1000, 20, "#9aa6b5", 1);
      canvas.current?.toBlob(value => { if (!canceled) setBlob(value); }, "image/png");
    }
    void draw(); return () => { canceled = true; };
  }, [teamName, logoData, headline, highlight, score]);
  function download() {
    if (!blob) return;
    const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "dugout2home-recap.png"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function share() {
    if (!blob) return;
    const files = [new File([blob], "dugout2home-recap.png", { type: "image/png" })];
    if (!navigator.canShare?.({ files }) || !navigator.share) { setMessage("Sharing is unavailable on this browser. Download the image and copy the caption, then attach them in your social app."); return; }
    try { await navigator.share({ files, text: caption, title: headline }); setMessage("Share sheet opened. Complete your post in the selected app."); }
    catch (error) { setMessage(error instanceof Error && error.name === "AbortError" ? "Sharing canceled." : "Could not share. Download the image and copy the caption instead."); }
  }
  return <details className="panel"><summary>Create a social recap</summary><p>Review the caption and image before sharing. The default post includes team results only. Add player details only when you intend to publish them.</p><div className="two-col"><div className="form-stack"><label>Image headline<input value={headline} onChange={e => setHeadline(e.target.value)} maxLength={120} /></label><label>Image highlight<textarea rows={3} value={highlight} onChange={e => setHighlight(e.target.value)} maxLength={160} /></label><label>Post caption<textarea rows={8} value={caption} onChange={e => setCaption(e.target.value)} maxLength={2200} /></label><button className="button secondary" onClick={async () => { try { await navigator.clipboard.writeText(caption); setMessage("Caption copied. Paste it into your social post."); } catch { setMessage("Select the caption and copy it manually."); } }}>Copy caption</button></div><canvas className="recap-canvas" width={1080} height={1080} ref={canvas} role="img" aria-label={`${teamName} recap image: ${headline}, ${score}. ${highlight}`} /></div><div className="actions"><button className="button primary" disabled={!blob} onClick={share}>Share image & caption</button><button className="button secondary" disabled={!blob} onClick={download}>Download recap image</button></div><p role="status">{message}</p><small>Use Download and Copy caption for Instagram, Facebook, or any app that does not appear in your device’s share menu.</small></details>;
}
