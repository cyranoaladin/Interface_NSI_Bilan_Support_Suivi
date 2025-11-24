export function News() {
    const articles = [
        {
            title: "Retour sur la Nuit du Code",
            desc: "Nos élèves se sont distingués lors de l'édition 2025. Une performance exceptionnelle de nos équipes de Première.",
            tag: "Événement"
        },
        {
            title: "Projet : Moteur d'échecs en Python",
            desc: "Les Terminales ont développé un jeu d'échecs complet avec IA min-max. Code source disponible sur le GitLab.",
            tag: "Projet Élève"
        },
        {
            title: "Paroles d'Anciens",
            desc: "Que sont devenus nos premiers bacheliers NSI ? Découvrez leurs parcours en MP2I, INSA et BUT Info.",
            tag: "Orientation"
        }
    ];

    return (
        <section id="actus" className="py-20">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-white mb-12 flex items-center gap-3">
                    <span className="text-blue-500">//</span> À la Une : L'actualité de la NSI à PMF
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {articles.map((article, idx) => (
                        <article key={idx} className="flex flex-col rounded-2xl border border-white/10 bg-gray-900/30 p-6 hover:bg-gray-900/50 transition-colors">
                            <div className="mb-4 h-48 w-full rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
                            <span className="mb-2 inline-block w-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                                {article.tag}
                            </span>
                            <h3 className="text-xl font-bold text-white mb-2">{article.title}</h3>
                            <p className="text-gray-400 text-sm flex-grow">{article.desc}</p>
                            <button className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300 text-left">
                                Lire la suite →
                            </button>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
