import Link from 'next/link';

export function Hero() {
    return (
        <section className="relative overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36">
            <div className="container mx-auto px-4 text-center">
                <div className="mx-auto max-w-4xl">
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        NSI-PMF : Codez Votre Avenir
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-gray-300">
                        La plateforme de la spécialité Numérique & Sciences Informatiques du Lycée Pierre Mendès France.
                        Explorez, apprenez, réussissez avec des outils pédagogiques de pointe et une gouvernance participative.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Link
                            href="#acces-rapides"
                            className="rounded-full bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all hover:scale-105"
                        >
                            &gt; Explorer
                        </Link>
                        <Link href="/decouvrir-nsi" className="text-sm font-semibold leading-6 text-white hover:text-blue-400 transition-colors">
                            En savoir plus <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Background effects */}
            <div className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 transform-gpu blur-3xl" aria-hidden="true">
                <div className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20" style={{ clipPath: 'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)' }} />
            </div>
        </section>
    );
}
