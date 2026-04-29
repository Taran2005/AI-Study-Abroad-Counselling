"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Clock, Flame, Sun, Snowflake } from "lucide-react";

const classifications = [
  {
    icon: Flame,
    label: "Hot Lead",
    range: "70–100",
    color: "text-red-500 dark:text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    description: "Immediate callback — high intent, financially ready, urgent timeline",
  },
  {
    icon: Sun,
    label: "Warm Lead",
    range: "40–69",
    color: "text-amber-500 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    description: "Follow-up within 24h — good intent, needs financial or timeline clarity",
  },
  {
    icon: Snowflake,
    label: "Cold Lead",
    range: "0–39",
    color: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    description: "Nurture campaign — early research stage, not yet ready to commit",
  },
];

const scoringFactors = [
  { icon: TrendingUp, label: "Intent Seriousness", weight: "40%", description: "Goals clarity and research depth" },
  { icon: DollarSign, label: "Financial Readiness", weight: "30%", description: "Budget alignment and funding awareness" },
  { icon: Clock, label: "Timeline Urgency", weight: "30%", description: "Application deadlines and test prep status" },
];

function AnimatedGauge({ score, isVisible }: { score: number; isVisible: boolean }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/50" />
        <circle
          cx="60" cy="60" r="54"
          strokeWidth="8" fill="none" strokeLinecap="round"
          className="text-primary transition-all duration-[1500ms] ease-out"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: isVisible ? offset : circumference,
          }}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{isVisible ? score : 0}</span>
        <span className="text-xs text-muted-foreground font-medium">Score</span>
      </div>
    </div>
  );
}

export default function LeadScoringSection() {
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
    <section ref={sectionRef} className="relative py-24 md:py-32 bg-card/30 border-y border-border overflow-hidden">
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className={`text-center mb-16 transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium rounded-full border border-primary/20 bg-primary/5 text-primary">
            Lead Scoring
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Qualify Leads <span className="text-primary">Automatically</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Every call generates an intelligent lead score. Counsellors instantly know who to prioritize.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left — Gauge + Scoring formula */}
          <div className={`space-y-8 transition-all duration-700 delay-200 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <AnimatedGauge score={82} isVisible={isVisible} />

            <div className="space-y-4">
              {scoringFactors.map((factor, i) => (
                <div
                  key={factor.label}
                  className={`flex items-center gap-4 transition-all duration-500 ease-out ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                  style={{ transitionDelay: isVisible ? `${i * 100 + 500}ms` : "0ms" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <factor.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">{factor.label}</span>
                      <span className="text-sm font-bold text-primary">{factor.weight}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{factor.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Classifications */}
          <div className="space-y-4">
            {classifications.map((cls, i) => (
              <Card
                key={cls.label}
                className={`group relative overflow-hidden ${cls.borderColor} bg-card/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: isVisible ? `${i * 150 + 400}ms` : "0ms" }}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`w-12 h-12 rounded-xl ${cls.bgColor} flex items-center justify-center shrink-0`}>
                    <cls.icon className={`w-6 h-6 ${cls.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-base font-semibold ${cls.color}`}>{cls.label}</h3>
                      <Badge variant="secondary" className={`text-xs ${cls.bgColor} ${cls.color} border-transparent`}>
                        {cls.range}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{cls.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
