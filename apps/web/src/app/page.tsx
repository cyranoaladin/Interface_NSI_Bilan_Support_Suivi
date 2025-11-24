import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { QuickAccess } from '@/components/landing/QuickAccess';
import { News } from '@/components/landing/News';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
      <Navbar />
      <main>
        <Hero />
        <QuickAccess />
        <News />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
