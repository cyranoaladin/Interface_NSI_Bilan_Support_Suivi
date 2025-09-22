'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="relative w-full h-64 rounded-xl overflow-hidden border border-white/10">
            <Image src="/banner.png" alt="NSI PMF" fill style={{ objectFit: 'cover' }} />
          </div>
          <h1 className="text-3xl font-poppins">NSI — Bilan Pédagogique PMF</h1>
          <p className="text-[var(--fg)]/80">
            NSI-PMF
          </p>
          <Link href="/login" className="inline-block rounded-xl bg-[#1F7AE0] px-6 py-3 text-white hover:bg-[#1864ba]">
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}
