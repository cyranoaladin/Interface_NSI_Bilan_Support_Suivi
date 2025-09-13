import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import 'dotenv/config';
import fs from 'fs';
const env = {
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://minio:9000',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || 'minioadmin',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || 'minioadmin',
};

async function main() {
  const prisma = new PrismaClient();
  const reportId = process.argv.find(a => a.startsWith('--report='))?.split('=')[1] || '';
  const outPath = process.argv.find(a => a.startsWith('--out='))?.split('=')[1] || 'docs/artifacts_premium_new/enseignant_premium_final.png';
  if (!reportId) throw new Error('Missing --report=<reportId>');

  const rpt = await prisma.report.findUnique({ where: { id: reportId } });
  if (!rpt || !rpt.pdfUrl) throw new Error('Report not found or pdfUrl missing');

  const s3 = new S3Client({ region: env.S3_REGION, endpoint: env.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } });
  const m = /^s3:\/\/(.+?)\/(.+)$/.exec(rpt.pdfUrl);
  if (!m) throw new Error('pdfUrl not S3');
  const bucket = m[1];
  const key = m[2];
  const tmpPdf = '/tmp/report_teacher.pdf';
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = obj.Body as any;
  const buf = await new Response(stream as any).arrayBuffer();
  fs.writeFileSync(tmpPdf, Buffer.from(buf));

  // Convert first page to PNG
  fs.mkdirSync('docs/artifacts_premium_new', { recursive: true });
  execSync(`pdftoppm -png -singlefile ${tmpPdf} ${outPath.replace(/\.png$/, '')}`);
  console.log('Saved:', outPath);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
