import { HeroSection } from '@/components/hero-section';
import { BackgroundCheckForm } from '@/components/background-check-form';

export default function Home() {
  return (
    <main className="flex-1">
      <HeroSection />
      <section className="max-w-6xl mx-auto px-4 py-12">
        <BackgroundCheckForm />
      </section>
    </main>
  );
}
