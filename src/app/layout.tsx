import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReeLabs — AI-Powered Stem Cell Banking & Therapy",
  description:
    "Meet Luna, India's first AI voice consultant for stem cell banking, therapy, and the Golden Vial Anti-Ageing program. Trusted by 10,000+ families.",
  keywords: [
    "stem cell banking",
    "stem cell therapy",
    "ReeLabs",
    "Luna AI",
    "anti-ageing",
    "Golden Vial",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
