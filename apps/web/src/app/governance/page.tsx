'use client';
import { useState } from 'react';
import Link from 'next/link';

type Proposal = {
    id: string;
    title: string;
    description: string;
    authorEmail: string;
    authorRole: string;
    status: string;
    createdAt: string;
    upvotes: number;
    downvotes: number;
    totalVotes: number;
    comments: any[];
};

export default function GovernancePage() {
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    // TODO: Fetch proposals with React Query
    // const { data: proposals, isLoading } = useQuery({
    //   queryKey: ['proposals', filter],
    //   queryFn: () => fetch(`/api/governance/proposals?status=${filter}`).then(r => r.json())
    // });

    return (
        <div className="min-h-screen bg-black text-white">
            <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">🏛️ Conseil des Sages NSI-PMF</h1>
                            <p className="text-gray-400 mt-2">
                                Proposez et votez pour les améliorations de la plateforme
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
                        >
                            + Nouvelle Proposition
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-8 border-b border-white/10">
                    {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-4 py-2 font-medium transition-colors ${filter === tab
                                    ? 'border-b-2 border-blue-500 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {tab === 'ALL' ? 'Toutes' : tab === 'PENDING' ? 'En vote' : tab === 'APPROVED' ? 'Approuvées' : 'Rejetées'}
                        </button>
                    ))}
                </div>

                {/* Placeholder */}
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">🏛️</div>
                    <h2 className="text-2xl font-bold mb-2">Gouvernance Participative</h2>
                    <p className="text-gray-400 mb-8">
                        Cette fonctionnalité sera bientôt disponible.<br />
                        Les élèves et enseignants pourront proposer et voter pour des améliorations.
                    </p>
                    <Link
                        href="/"
                        className="inline-block rounded-full bg-gray-800 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
                    >
                        Retour à l'accueil
                    </Link>
                </div>
            </main>

            {/* TODO: CreateProposalModal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full">
                        <h2 className="text-2xl font-bold mb-4">Nouvelle Proposition</h2>
                        <p className="text-gray-400 mb-6">
                            Décrivez votre idée d'amélioration pour la plateforme NSI-PMF.
                        </p>
                        {/* TODO: Form */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 rounded-full bg-gray-800 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
                            >
                                Annuler
                            </button>
                            <button className="flex-1 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
                                Soumettre
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
