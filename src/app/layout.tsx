import type { Metadata } from "next";
import { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tidview",
  description: "Track Polymarket positions anywhere",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
