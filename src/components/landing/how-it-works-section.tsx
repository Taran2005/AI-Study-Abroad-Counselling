"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  PhoneCall,
  MessageCircle,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";

const steps = [
  {
    icon: PhoneCall,
    step: "01",
    title: "Student Initiates Call",
    description:
      "Student clicks 'Talk to Counsellor' and is instantly connected to the AI voice agent — no wait times, no queue. Available 24/7.",
  },
  {
    icon: MessageCircle,
    step: "02",
    title: "AI Converses Naturally",
    description:
      "The AI counsellor asks smart questions in English, Hindi, or Marathi. It understands context, adapts tone based on sentiment, and answers queries from the knowledge base.",
  },
  {
    icon: ClipboardList,
    step: "03",
    title: "Data Auto-Extracted",
    description:
      "During the conversation, 12+ data points are extracted automatically — education, test scores, budget, preferences — without any forms or friction.",
  },
  {
    icon: LayoutDashboard,
    step: "04",
    title: "Counsellor Gets Insights",
    description:
      "Post-call, the counsellor dashboard lights up: lead score, transcript, profile summary, university recommendations, and a WhatsApp summary is sent to the student.",
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-card/30 border-y border-border overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/3 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ease-out ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          <Badge
            variant="secondary"
            className="mb-4 px-4 py-1.5 text-sm font-medium rounded-full border border-primary/20 bg-primary/5 text-primary"
          >
            How It Works
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            From Call to{" "}
            <span className="text-primary">Qualified Lead</span> in Minutes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Four seamless steps — zero manual effort. The AI handles the
            conversation while you focus on closing.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-4">
          {steps.map((step, i) => (
            <div
              key={step.step}
              className={`relative transition-all duration-700 ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isVisible ? `${i * 150 + 200}ms` : "0ms",
              }}
            >
              {/* Connecting line (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[calc(100%-20%)] h-px">
                  <div className="w-full h-px bg-gradient-to-r from-primary/30 to-primary/10" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/40" />
                </div>
              )}

              <Card className="group relative overflow-hidden border-primary/10 bg-card/80 hover:border-primary/25 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-300">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-3xl font-bold text-primary/20 group-hover:text-primary/30 transition-colors">
                      {step.step}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </CardContent>

                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
