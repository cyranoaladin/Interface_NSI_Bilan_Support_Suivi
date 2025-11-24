import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').toLowerCase();
  const notionId = searchParams.get('notionId') || undefined;
  const take = Number(searchParams.get('k') || '10');

  // Simple search over ResourceDocument title/description; filter by notion link if provided
  const docs = await prisma.resourceDocument.findMany({
    where: {
      AND: [
        q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {},
        notionId ? { notions: { some: { notionId } } } : {},
      ],
    },
    orderBy: { uploadedAt: 'desc' },
    take,
  });

  const results = docs.map((d) => ({
    docId: d.id,
    title: d.title,
    snippet: d.description || '',
    score: 1,
  }));

  return NextResponse.json({ results });
}