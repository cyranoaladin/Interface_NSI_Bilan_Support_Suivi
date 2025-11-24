import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const comments = await prisma.comment.findMany({
            where: { proposalId: params.id },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error('[API] GET /api/governance/proposals/[id]/comments error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

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
        const { content } = body;

        if (!content || content.length < 10 || content.length > 2000) {
            return NextResponse.json(
                { error: 'Comment must be between 10 and 2000 characters' },
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

        const comment = await prisma.comment.create({
            data: {
                proposalId: params.id,
                authorEmail: session.email,
                authorRole: session.role || 'STUDENT',
                content
            }
        });

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error('[API] POST /api/governance/proposals/[id]/comments error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
