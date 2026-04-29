"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Mic,
  Globe,
  Zap,
  Heart,
  Camera,
  ArrowRight,
  Volume2,
} from "lucide-react";

const agentFeatures = [
  {
    icon: Globe,
    title: "Multilingual Support",
    description: "English, Hindi, Marathi with Hinglish code-switching",
  },
  {
    icon: Zap,
    title: "Ultra-Low Latency",
    description: "< 3s end-to-end: Deepgram STT → GPT-4o → ElevenLabs TTS",
  },
  {
    icon: Heart,
    title: "Sentiment-Aware",
    description: "Adapts tone per turn based on student emotion",
  },
  {
    icon: Camera,
    title: "Camera & Screen Share",
    description: "Share documents for real-time review during the call",
  },
];

function WaveformAnimation() {
  return (
    <div className="flex items-end gap-[3px] h-8">
      {[...Array(16)].map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-primary/60 animate-pulse"
          style={{
            height: `${Math.random() * 60 + 20}%`,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function AgentShowcaseSection() {
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
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="agent" ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/3" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Features */}
          <div className={`transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium rounded-full border border-primary/20 bg-primary/5 text-primary">
              AI Voice Agent
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Meet Your <span className="text-primary">AI Counsellor</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              A lifelike AI avatar powered by Anam AI, synced to real-time speech. Students get a face-to-face counselling experience — without waiting.
            </p>

            <div className="space-y-5">
              {agentFeatures.map((feature, i) => (
                <div
                  key={feature.title}
                  className={`flex items-start gap-4 transition-all duration-500 ease-out ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                  style={{ transitionDelay: isVisible ? `${i * 100 + 300}ms` : "0ms" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link href="/agent">
                <Button size="lg" className="rounded-full px-8 gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  <Mic className="w-5 h-5" />
                  Try the Agent
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right — Agent Mockup */}
          <div className={`transition-all duration-700 delay-300 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <Card className="relative overflow-hidden border-primary/10 bg-card/80 shadow-xl">
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                    <Mic className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">StudyBuddyAI AI Counsellor</div>
                    <div className="flex items-center gap-1.5 text-xs text-primary">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Speaking...
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-primary" />
                  </div>
                </div>

                <div className="relative w-full aspect-video rounded-xl bg-gradient-to-br from-primary/10 via-accent to-primary/5 flex items-center justify-center overflow-hidden">
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                      <Mic className="w-10 h-10 text-primary" />
                    </div>
                    <WaveformAnimation />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md bg-primary text-primary-foreground text-sm">
                      I want to study CS in the UK. IELTS is 6.5.
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-muted text-foreground text-sm">
                      With IELTS 6.5, you qualify for Leeds, Queen&apos;s Belfast, and Glasgow. What&apos;s your budget?
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center animate-pulse">
                    <Mic className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
