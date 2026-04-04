"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  GraduationCap,
  Users,
  Sparkles,
  ArrowRight,
  Building2,
  Globe,
  MessageCircle,
  BookOpen,
  Plane,
} from "lucide-react";

const stats = [
  { icon: Users, value: "45,000", label: "Students Placed", suffix: "+" },
  { icon: Building2, value: "120", label: "Partner Universities", suffix: "+" },
  { icon: Globe, value: "UK & Ireland", label: "Destinations", suffix: "" },
];

const features = [
  {
    icon: MessageCircle,
    title: "24/7 AI Counselling",
    description: "Get instant answers about universities, courses, and admissions anytime",
  },
  {
    icon: BookOpen,
    title: "IELTS/PTE Guidance",
    description: "Personalized test preparation advice and score requirements",
  },
  {
    icon: Plane,
    title: "Visa Assistance",
    description: "Step-by-step guidance through the visa application process",
  },
];

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-background" />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="flex flex-col items-center text-center gap-8">
            {/* Badge */}
            <div
              className={`transition-all duration-700 ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <Badge
                variant="secondary"
                className="px-4 py-1.5 text-sm font-medium gap-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Your AI-Powered Study Abroad Counsellor
              </Badge>
            </div>

            {/* Headline */}
            <div
              className={`space-y-4 transition-all duration-700 delay-100 ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-foreground">
                Your Dream University{" "}
                <span className="relative">
                  <span className="text-primary">Awaits</span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-3 text-primary/30"
                    viewBox="0 0 200 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 8C30 4 70 2 100 4C130 6 170 8 198 4"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed">
                Meet your personal AI counsellor — ask about UK &amp; Ireland universities, 
                admission requirements, scholarships, or visa process. 
                <strong className="text-foreground"> Instantly. In your language.</strong>
              </p>
            </div>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-200 ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
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
              <Link href="#services">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-base font-semibold rounded-full gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
                >
                  <GraduationCap className="w-5 h-5" />
                  Explore Programs
                </Button>
              </Link>
            </div>

            {/* Trust indicator text */}
            <p
              className={`text-sm text-muted-foreground transition-all duration-700 delay-300 ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              Trusted by <strong className="text-foreground">45,000+</strong>{" "}
              students across India • Available 24/7 • Speaks Hindi, English &amp; Marathi
            </p>

            {/* Stat Cards */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 w-full max-w-3xl mt-4 transition-all duration-700 delay-[400ms] ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              {stats.map((stat, i) => (
                <Card
                  key={stat.label}
                  className="group relative overflow-hidden border-primary/10 bg-card/60 backdrop-blur-sm hover:border-primary/25 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CardContent className="flex flex-col items-center gap-2 py-6 px-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      {stat.value}
                      <span className="text-primary">{stat.suffix}</span>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </CardContent>

                  {/* Subtle hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 w-full bg-card/30 backdrop-blur-sm border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <div
            className={`text-center mb-12 transition-all duration-700 delay-500 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              How StudyBuddyAI Helps You
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our AI counsellor guides you through every step of your study abroad journey
            </p>
          </div>

          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700 delay-[600ms] ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            {features.map((feature, i) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-primary/10 bg-card/80 hover:border-primary/25 hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardContent className="flex flex-col items-start gap-4 p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
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

                {/* Subtle hover glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </Card>
            ))}
          </div>

          {/* Secondary CTA */}
          <div
            className={`flex justify-center mt-12 transition-all duration-700 delay-700 ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <Link href="/agent">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
              >
                <MessageCircle className="w-5 h-5" />
                Ask Your Questions Now
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
