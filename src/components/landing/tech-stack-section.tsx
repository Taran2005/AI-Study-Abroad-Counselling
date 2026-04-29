"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";

const techRow1 = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS v4",
  "shadcn/ui",
  "LiveKit Agents",
  "OpenAI GPT-4o",
  "Deepgram Nova-3",
  "ElevenLabs TTS",
  "Anam AI Avatar",
];

const techRow2 = [
  "Supabase",
  "PostgreSQL",
  "pgvector",
  "Twilio WhatsApp",
  "Cal.com",
  "Docker",
  "Vercel",
  "Python",
  "Recharts",
  "Biome",
];

function MarqueeRow({
  items,
  direction = "left",
  duration = 30,
}: {
  items: string[];
  direction?: "left" | "right";
  duration?: number;
}) {
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex gap-4 w-max"
        style={{
          animation: `marquee-${direction} ${duration}s linear infinite`,
        }}
      >
        {doubled.map((item, i) => (
          <Badge
            key={`${item}-${i}`}
            variant="secondary"
            className="px-5 py-2.5 text-sm font-medium rounded-full border border-primary/10 bg-card/80 text-foreground whitespace-nowrap hover:bg-primary/5 hover:border-primary/20 transition-colors duration-300"
          >
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function TechStackSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style jsx>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <section id="tech-stack" ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className={`text-center mb-12 transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium rounded-full border border-primary/20 bg-primary/5 text-primary">
              Tech Stack
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Built With <span className="text-primary">Best-in-Class</span> Tech
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              A production-grade stack combining the latest AI models, real-time infrastructure, and modern web frameworks.
            </p>
          </div>
        </div>

        {/* Marquee rows — full width */}
        <div className={`space-y-4 transition-all duration-700 delay-300 ease-out ${isVisible ? "opacity-100" : "opacity-0"}`}>
          {/* Gradient masks */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <MarqueeRow items={techRow1} direction="left" duration={35} />
          </div>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <MarqueeRow items={techRow2} direction="right" duration={40} />
          </div>
        </div>
      </section>
    </>
  );
}
