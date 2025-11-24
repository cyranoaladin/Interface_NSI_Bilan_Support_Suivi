import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function DecouvrirNSI() {
    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />
            <main className="container mx-auto px-4 py-20">
                <h1 className="text-4xl font-bold mb-8">Découvrir la NSI</h1>
                <p className="text-gray-400 text-lg">
                    Cette page est en cours de construction. Elle présentera bientôt le programme détaillé,
                    les projets des élèves et les témoignages des anciens.
                </p>
            </main>
            <Footer />
        </div>
    );
}
