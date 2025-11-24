import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || undefined;

        const proposals = await prisma.proposal.findMany({
            where: status ? { status } : undefined,
            include: {
                votes: true,
                comments: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculer les statistiques de vote pour chaque proposition
        const proposalsWithStats = proposals.map(p => ({
            ...p,
            upvotes: p.votes.filter(v => v.voteType === 'UP').length,
            downvotes: p.votes.filter(v => v.voteType === 'DOWN').length,
            totalVotes: p.votes.length
        }));

        return NextResponse.json(proposalsWithStats);
    } catch (error) {
        console.error('[API] GET /api/governance/proposals error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, description } = body;

        if (!title || !description) {
            return NextResponse.json(
                { error: 'Title and description are required' },
                { status: 400 }
            );
        }

        if (title.length < 10 || title.length > 200) {
            return NextResponse.json(
                { error: 'Title must be between 10 and 200 characters' },
                { status: 400 }
            );
        }

        if (description.length < 50 || description.length > 5000) {
            return NextResponse.json(
                { error: 'Description must be between 50 and 5000 characters' },
                { status: 400 }
            );
        }

        const proposal = await prisma.proposal.create({
            data: {
                title,
                description,
                authorEmail: session.email,
                authorRole: session.role || 'STUDENT',
                status: 'PENDING'
            }
        });

        // TODO: Déclencher analyse IA en arrière-plan
        // await analyzeProposalWithAI(proposal.id);

        return NextResponse.json(proposal, { status: 201 });
    } catch (error) {
        console.error('[API] POST /api/governance/proposals error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
