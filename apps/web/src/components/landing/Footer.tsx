import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black py-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-purple-600" />
                            <span className="text-lg font-bold text-white">NSI-PMF</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            © 2025 Lycée Pierre Mendès France, Tunis.<br />
                            Tous droits réservés.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Liens Utiles</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="https://www.lyceepmf.tn" target="_blank" rel="noopener noreferrer" className="hover:text-white">Site du Lycée</a></li>
                            <li><a href="#" className="hover:text-white">Pronote</a></li>
                            <li><Link href="/mentions-legales" className="hover:text-white">Mentions Légales</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Contact</h3>
                        <p className="text-sm text-gray-400">
                            Une question ? Un projet ?<br />
                            <a href="mailto:nsi.contact@pmf.tn" className="text-blue-400 hover:text-blue-300">nsi.contact@pmf.tn</a>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
