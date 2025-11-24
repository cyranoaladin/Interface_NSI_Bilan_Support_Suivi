import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'STUDENT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Récupérer tous les bilans de l'élève
        const bilans = await prisma.bilan.findMany({
            where: {
                studentEmail: session.email,
                status: { not: 'PENDING' } // Seulement les bilans complétés
            },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                createdAt: true,
                qcmScores: true,
                status: true
            }
        });

        // Formater les données pour la timeline
        const timeline = bilans.map((bilan: any, index: number) => {
            const scores = bilan.qcmScores as Record<string, number> | null;
            const globalScore = scores
                ? Math.round(Object.values(scores).reduce((sum, val) => sum + val, 0) / Object.values(scores).length * 100)
                : 0;

            // Déterminer le statut
            const isLatest = index === bilans.length - 1;
            const status = isLatest ? 'current' : 'completed';

            return {
                date: new Date(bilan.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
                title: `Bilan ${index === 0 ? 'de rentrée' : index === bilans.length - 1 ? 'actuel' : `#${index + 1}`}`,
                status,
                description: `Score global: ${globalScore}%`
            };
        });

        // Ajouter un bilan "à venir" si l'élève a au moins un bilan
        if (bilans.length > 0) {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            timeline.push({
                date: nextMonth.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
                title: 'Prochain bilan',
                status: 'upcoming',
                description: 'À compléter'
            });
        }

        // Récupérer les scores du dernier bilan pour le radar chart
        const latestBilan = bilans[bilans.length - 1];
        const scores = latestBilan?.qcmScores as Record<string, number> | null || {};

        // Normaliser les scores (0-1) pour le radar chart
        const normalizedScores: Record<string, number> = {};
        if (scores && typeof scores === 'object') {
            Object.entries(scores).forEach(([key, value]) => {
                // Les scores sont déjà entre 0 et 1 normalement
                normalizedScores[key] = typeof value === 'number' ? value : 0;
            });
        }

        // Calculer les points faibles (score < 0.7)
        const weakPoints = Object.entries(normalizedScores)
            .filter(([_, score]) => score < 0.7)
            .map(([domain, score]) => ({
                domain,
                score: Math.round(score * 100)
            }))
            .sort((a, b) => a.score - b.score);

        return NextResponse.json({
            ok: true,
            timeline,
            scores: normalizedScores,
            weakPoints,
            hasData: bilans.length > 0
        });

    } catch (error) {
        console.error('Error fetching student progression:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
