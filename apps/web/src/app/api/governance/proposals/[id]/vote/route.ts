import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { voteType } = body;

        if (!voteType || !['UP', 'DOWN'].includes(voteType)) {
            return NextResponse.json(
                { error: 'Invalid vote type. Must be UP or DOWN' },
                { status: 400 }
            );
        }

        // Vérifier que la proposition existe
        const proposal = await prisma.proposal.findUnique({
            where: { id: params.id }
        });

        if (!proposal) {
            return NextResponse.json(
                { error: 'Proposal not found' },
                { status: 404 }
            );
        }

        if (proposal.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'Cannot vote on a proposal that is not pending' },
                { status: 400 }
            );
        }

        // Créer ou mettre à jour le vote
        const vote = await prisma.vote.upsert({
            where: {
                proposalId_voterEmail: {
                    proposalId: params.id,
                    voterEmail: session.email
                }
            },
            update: { voteType },
            create: {
                proposalId: params.id,
                voterEmail: session.email,
                voteType
            }
        });

        // TODO: Vérifier le seuil d'approbation
        // await checkProposalThreshold(params.id);

        return NextResponse.json(vote);
    } catch (error) {
        console.error('[API] POST /api/governance/proposals/[id]/vote error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Supprimer le vote de l'utilisateur
        await prisma.vote.delete({
            where: {
                proposalId_voterEmail: {
                    proposalId: params.id,
                    voterEmail: session.email
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] DELETE /api/governance/proposals/[id]/vote error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
