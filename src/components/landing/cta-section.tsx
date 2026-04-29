"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, ArrowRight, Sparkles } from "lucide-react";

export default function CtaSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-pulse [animation-delay:1.5s]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className={`space-y-6 transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Ready to Transform Your{" "}
            <span className="text-primary">Counselling?</span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start a free AI counselling session now. No sign-up required. Ask about universities,
            admissions, IELTS, visa — anything. Available 24/7 in English, Hindi, and Marathi.
          </p>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center pt-4 transition-all duration-700 delay-200 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <Link href="/agent">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-semibold rounded-full gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Mic className="w-5 h-5" />
                Start Free Counselling
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-semibold rounded-full gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
              >
                View Counsellor Dashboard
              </Button>
            </Link>
          </div>

          <p className={`text-sm text-muted-foreground transition-all duration-700 delay-400 ease-out ${isVisible ? "opacity-100" : "opacity-0"}`}>
            Trusted by <strong className="text-foreground">45,000+</strong> students •{" "}
            <strong className="text-foreground">120+</strong> partner universities •{" "}
            Free to try
          </p>
        </div>
      </div>
    </section>
  );
}
