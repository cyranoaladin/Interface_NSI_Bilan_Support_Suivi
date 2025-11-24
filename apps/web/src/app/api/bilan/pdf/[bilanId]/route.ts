export const dynamic = 'force-dynamic';
import { getSession } from '@/lib/auth-utils';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { bilanId: string } }) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { bilanId } = params;
  const bilan = await prisma.bilan.findUnique({ where: { id: bilanId } });

  if (!bilan) {
    return NextResponse.json({ ok: false, error: 'Bilan not found' }, { status: 404 });
  }

  // Authorization check
  let isAuthorized = false;

  if (session.role === 'STUDENT') {
    // Student can access their own bilans
    const isStudent = bilan.studentEmail === session.email;
    isAuthorized = isStudent;
  } else if (session.role === 'TEACHER' && bilan.studentEmail) {
    // Teacher can access bilans for students in their groups
    const student = await prisma.student.findUnique({ where: { email: bilan.studentEmail } });
    if (student?.groupId) {
      const teacherAccess = await prisma.teacherOnGroup.findUnique({
        where: { teacherEmail_groupId: { teacherEmail: session.email, groupId: student.groupId } },
      });
      isAuthorized = !!teacherAccess;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  if (bilan.status !== 'GENERATED' || !bilan.reportText) {
    return NextResponse.json({ ok: false, error: 'PDF not ready yet' }, { status: 404 });
  }

  // Parse the report
  let report: any = {};
  try {
    report = JSON.parse(bilan.reportText);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid report data' }, { status: 500 });
  }

  // Generate HTML
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bilan d'entrée ${bilan.matiere} - ${bilan.niveau}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #2563eb;
      text-align: center;
      margin-bottom: 10px;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
    }
    h2 {
      color: #1e40af;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 5px;
      margin-top: 30px;
    }
    h3 {
      color: #1e3a8a;
      margin-top: 20px;
    }
    ul {
      list-style-type: none;
      padding-left: 0;
    }
    li {
      padding: 5px 0 5px 20px;
      position: relative;
    }
    li:before {
      content: "•";
      color: #3b82f6;
      font-weight: bold;
      position: absolute;
      left: 0;
    }
    .week {
      background: #f8fafc;
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
    }
    .seance {
      margin-left: 20px;
      margin-top: 10px;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .print-btn:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Imprimer / Télécharger PDF</button>
  
  <h1>Bilan d'entrée ${bilan.matiere} - ${bilan.niveau}</h1>
  <div class="subtitle">
    <strong>Élève:</strong> ${bilan.studentEmail}<br>
    <strong>Date:</strong> ${new Date(bilan.createdAt).toLocaleDateString('fr-FR')}
  </div>

  ${report.synthese_profil ? `
    <h2>Synthèse du profil</h2>
    ${report.synthese_profil.points_forts?.length > 0 ? `
      <h3>Points forts</h3>
      <ul>
        ${report.synthese_profil.points_forts.map((pf: string) => `<li>${pf}</li>`).join('')}
      </ul>
    ` : ''}
    ${report.synthese_profil.points_faibles?.length > 0 ? `
      <h3>Points à améliorer</h3>
      <ul>
        ${report.synthese_profil.points_faibles.map((pf: string) => `<li>${pf}</li>`).join('')}
      </ul>
    ` : ''}
  ` : ''}

  ${report.plan_4_semaines ? `
    <h2>Plan de remédiation sur 4 semaines</h2>
    ${[1, 2, 3, 4].map(i => {
    const semaine = report.plan_4_semaines[`semaine_${i}`];
    if (!semaine) return '';
    return `
        <div class="week">
          <h3>Semaine ${i}</h3>
          ${semaine.objectifs ? `<p><strong>Objectifs:</strong> ${semaine.objectifs}</p>` : ''}
          ${semaine.seances?.length > 0 ? `
            <div class="seance">
              ${semaine.seances.map((seance: any) => `
                <p><strong>• ${seance.titre || 'Séance'}</strong></p>
                ${seance.exercices ? `<p style="margin-left: 20px; font-size: 0.9em;">Exercices: ${seance.exercices}</p>` : ''}
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
  }).join('')}
  ` : ''}

  ${report.indicateurs_pedago ? `
    <h2>Indicateurs pédagogiques</h2>
    <ul>
      ${Object.entries(report.indicateurs_pedago).map(([key, value]) => `<li>${value}</li>`).join('')}
    </ul>
  ` : ''}
</body>
</html>
  `;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
