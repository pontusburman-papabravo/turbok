import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turbok",
  description: "Planera digitalt. Vandra analogt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
