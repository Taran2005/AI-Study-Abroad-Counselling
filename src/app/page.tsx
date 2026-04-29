import Navbar from "@/components/navbar/navbar";
import HeroSection from "@/components/hero/hero-section";
import FeaturesSection from "@/components/landing/features-section";
import HowItWorksSection from "@/components/landing/how-it-works-section";
import AgentShowcaseSection from "@/components/landing/agent-showcase-section";
import LeadScoringSection from "@/components/landing/lead-scoring-section";
import TechStackSection from "@/components/landing/tech-stack-section";
import TestimonialsSection from "@/components/landing/testimonials-section";
import StatsSection from "@/components/landing/stats-section";
import CtaSection from "@/components/landing/cta-section";
import Footer from "@/components/footer/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <AgentShowcaseSection />
        <LeadScoringSection />
        <StatsSection />
        {/* <TechStackSection /> */}
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
