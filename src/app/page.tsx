import Navbar from "@/components/navbar/navbar";
import HeroSection from "@/components/hero/hero-section";
import Footer from "@/components/footer/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
      </main>
      <Footer />
    </>
  );
}
