import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dugout2Home",
  description: "Turn every game into a development plan."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">Dugout<span>2</span>Home</Link>
          <nav>
            <Link href="/analyze">Scorebook</Link>
            <Link href="/players">Players</Link>
            <Link href="/practice">Practice</Link>
            <Link href="/recaps">Recaps</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
