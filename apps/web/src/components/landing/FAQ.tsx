'use client';
import { useState } from 'react';

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const items = [
        {
            q: "Faut-il être excellent en maths pour faire NSI ?",
            r: "Non. Une bonne logique est plus importante que la virtuosité mathématique. La NSI développe une forme de rigueur et de créativité qui lui est propre et qui est complémentaire des mathématiques."
        },
        {
            q: "Est-ce qu'on ne fait que 'coder' toute la journée ?",
            r: "Le code est notre principal outil, mais la NSI est une science bien plus vaste. Elle englobe l'architecture des ordinateurs, la gestion des données, la théorie des algorithmes et la compréhension des réseaux. C'est apprendre à structurer sa pensée pour résoudre des problèmes complexes."
        },
        {
            q: "Quels sont les débouchés concrets après la NSI ?",
            r: "La NSI est une voie privilégiée vers toutes les formations du numérique : écoles d'ingénieurs, classes préparatoires (MP2I), BUT Informatique, licences spécialisées, mais aussi vers des domaines de pointe comme la bio-informatique, la cybersécurité ou l'intelligence artificielle."
        }
    ];

    return (
        <section id="faq" className="py-20 bg-black/20">
            <div className="container mx-auto px-4 max-w-3xl">
                <h2 className="text-3xl font-bold text-white mb-12 text-center">
                    FAQ : 3 questions pour tout comprendre
                </h2>
                <div className="space-y-4">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl border border-white/10 bg-gray-900/30 overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-white/5"
                            >
                                <span className="text-lg font-medium text-white">{item.q}</span>
                                <span className={`ml-6 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 transition-transform ${openIndex === idx ? 'rotate-180' : ''}`}>
                                    ↓
                                </span>
                            </button>
                            {openIndex === idx && (
                                <div className="px-6 pb-6 text-gray-400 animate-in slide-in-from-top-2">
                                    {item.r}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
