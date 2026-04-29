"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Clock, Zap } from "lucide-react";

const stats = [
  { icon: Users, value: 45000, suffix: "+", label: "Students Placed", description: "Across India and globally" },
  { icon: Building2, value: 120, suffix: "+", label: "Partner Universities", description: "In UK & Ireland" },
  { icon: Clock, value: 24, suffix: "/7", label: "AI Availability", description: "Zero wait time, always on" },
  { icon: Zap, value: 3, suffix: "s", prefix: "<", label: "Response Latency", description: "End-to-end AI response" },
];

function useCountUp(target: number, isVisible: boolean, duration = 1200) {
  const [count, setCount] = useState(0);

  const animate = useCallback(() => {
    if (!isVisible) return;
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }, [target, isVisible, duration]);

  useEffect(() => {
    animate();
  }, [animate]);

  return count;
}

function StatBlock({
  stat,
  isVisible,
  delay,
}: {
  stat: (typeof stats)[0];
  isVisible: boolean;
  delay: number;
}) {
  const count = useCountUp(stat.value, isVisible);

  return (
    <div
      className={`text-center space-y-3 transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: isVisible ? `${delay}ms` : "0ms" }}
    >
      <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
        <stat.icon className="w-7 h-7 text-primary" />
      </div>
      <div className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
        {stat.prefix && <span className="text-primary">{stat.prefix}</span>}
        {isVisible ? count.toLocaleString() : "0"}
        <span className="text-primary">{stat.suffix}</span>
      </div>
      <div>
        <div className="text-base font-semibold text-foreground">{stat.label}</div>
        <div className="text-sm text-muted-foreground">{stat.description}</div>
      </div>
    </div>
  );
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className={`text-center mb-16 transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium rounded-full border border-primary/20 bg-primary/5 text-primary">
            By the Numbers
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Trusted at <span className="text-primary">Scale</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <StatBlock key={stat.label} stat={stat} isVisible={isVisible} delay={i * 100 + 200} />
          ))}
        </div>
      </div>
    </section>
  );
}
