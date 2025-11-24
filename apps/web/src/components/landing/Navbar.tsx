import Link from 'next/link';

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
                    <span className="text-xl font-bold tracking-tight text-white">NSI-PMF</span>
                </div>

                <nav className="hidden md:flex items-center gap-8">
                    <Link href="/decouvrir-nsi" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Découvrir la NSI
                    </Link>
                    <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Espace Première
                    </Link>
                    <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Espace Terminale
                    </Link>
                    <Link href="/governance" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                        Conseil des Sages
                    </Link>
                </nav>

                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-gray-200 transition-colors"
                    >
                        Se Connecter
                    </Link>
                </div>
            </div>
        </header>
    );
}
