"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Mumbai, India",
    course: "MSc Data Science — University of Leeds",
    quote:
      "StudyBuddyAI answered all my questions about UK universities at 11 PM. The AI counsellor knew everything about IELTS requirements and even suggested scholarships I didn't know existed!",
    rating: 5,
  },
  {
    name: "Rahul Patel",
    location: "Ahmedabad, India",
    course: "MBA — Trinity College Dublin",
    quote:
      "I was confused between 5 universities. The AI counsellor walked me through each option, compared costs, and helped me narrow it down — all in one 15-minute call. Incredible.",
    rating: 5,
  },
  {
    name: "Sneha Deshmukh",
    location: "Pune, India",
    course: "BEng Computer Engineering — Queen's Belfast",
    quote:
      "मला मराठीत बोलता आलं — that was amazing! The counsellor understood my Marathi perfectly and switched to English when explaining technical visa requirements. Felt like talking to a real person.",
    rating: 5,
  },
];

export default function TestimonialsSection() {
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
      <div className="absolute top-0 left-1/3 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className={`text-center mb-16 transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium rounded-full border border-primary/20 bg-primary/5 text-primary">
            Testimonials
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Students <span className="text-primary">Love</span> StudyBuddyAI
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Real stories from students who used our AI counsellor for their study abroad journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Card
              key={t.name}
              className={`group relative overflow-hidden border-primary/10 bg-card/80 hover:border-primary/25 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: isVisible ? `${i * 150 + 200}ms` : "0ms" }}
            >
              <CardContent className="flex flex-col gap-4 p-6">
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-primary/20" />

                {/* Rating */}
                <div className="flex gap-0.5">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>

                {/* Quote text */}
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="pt-2 border-t border-border">
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.location}</div>
                  <div className="text-xs text-primary font-medium mt-1">{t.course}</div>
                </div>
              </CardContent>

              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
