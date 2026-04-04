import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  title: "StudyBuddyAI — AI-Powered Study Abroad Counsellor",
  description:
    "Your personal AI counsellor for UK & Ireland universities. Get instant guidance on admissions, scholarships, IELTS/PTE, and visa process. Trusted by 45,000+ students.",
  keywords: [
    "study abroad",
    "UK universities",
    "Ireland education",
    "StudyBuddyAI",
    "AI counsellor",
    "IELTS preparation",
    "student visa",
    "overseas education",
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
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
