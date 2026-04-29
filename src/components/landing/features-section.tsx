"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  BrainCircuit,
  BarChart3,
  BookOpen,
  MessageSquare,
  CalendarCheck,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "AI Voice Counsellor",
    description:
      "Natural, real-time voice conversations with an AI counsellor powered by GPT-4o. Speaks English, Hindi & Marathi with Hinglish code-switching.",
    badge: "Core",
  },
  {
    icon: BrainCircuit,
    title: "Smart Data Extraction",
    description:
      "Automatically extracts 12+ structured data points — name, education, IELTS scores, budget, preferences — naturally during conversation. No forms needed.",
    badge: "AI-Powered",
  },
  {
    icon: BarChart3,
    title: "Lead Qualification Scoring",
    description:
      "Intelligent post-call scoring: Intent (40%) + Financial Readiness (30%) + Timeline Urgency (30%). Auto-classifies leads as Hot, Warm, or Cold.",
    badge: "Analytics",
  },
  {
    icon: BookOpen,
    title: "RAG Knowledge Base",
    description:
      "Chunked document ingestion with OpenAI embeddings and pgvector. Answers university, visa, and scholarship queries live during the call.",
    badge: "Search",
  },
  {
    icon: MessageSquare,
    title: "Post-Call Automation",
    description:
      "Automatic WhatsApp summary via Twilio, personalized university recommendations, PDF study plans, and Slack alerts for hot leads.",
    badge: "Automation",
  },
  {
    icon: CalendarCheck,
    title: "Appointment Booking",
    description:
      "Seamless Cal.com integration with counsellor availability. Student details pre-filled from the AI conversation. Confirmations via WhatsApp.",
    badge: "Scheduling",
  },
];

export default function FeaturesSection() {
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
      id="features"
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

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
            Platform Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Everything You Need to{" "}
            <span className="text-primary">Scale Counselling</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            From the first student conversation to appointment booking — StudyBuddyAI
            automates the entire pipeline with AI.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              className={`group relative overflow-hidden border-primary/10 bg-card/80 hover:border-primary/25 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isVisible ? `${i * 100 + 200}ms` : "0ms",
              }}
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-300">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs font-medium rounded-full border-primary/10 bg-primary/5 text-primary"
                  >
                    {feature.badge}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </CardContent>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
