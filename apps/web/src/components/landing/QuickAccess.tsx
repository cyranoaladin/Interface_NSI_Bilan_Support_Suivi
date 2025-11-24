import Link from 'next/link';

export function QuickAccess() {
    const cards = [
        {
            title: "Découvrir la NSI",
            icon: "🧭",
            desc: "Pourquoi choisir cette spécialité ? Découvrez les projets et les débouchés.",
            href: "/decouvrir-nsi",
            color: "from-orange-500 to-red-500"
        },
        {
            title: "Espace Première",
            icon: "💻",
            desc: "Accédez à vos cours, TP, projets et suivez votre progression.",
            href: "/login",
            color: "from-blue-500 to-cyan-500"
        },
        {
            title: "Espace Terminale",
            icon: "🏆",
            desc: "Consultez vos bilans, préparez le Bac et le Grand Oral.",
            href: "/login",
            color: "from-purple-500 to-pink-500"
        }
    ];

    return (
        <section id="acces-rapides" className="py-16 bg-black/20">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {cards.map((card, idx) => (
                        <Link
                            key={idx}
                            href={card.href}
                            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/50 p-8 hover:border-white/20 transition-all hover:-translate-y-1"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                            <div className="text-4xl mb-4">{card.icon}</div>
                            <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                            <p className="text-gray-400">{card.desc}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
