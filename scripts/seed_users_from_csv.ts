import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const HEADERS: Record<string, string[]> = {
  email: ['Email','email','Adresse e-mail','Adresse E-mail','Adresse email'],
  givenName: ['Prénom','Prenom','First Name'],
  familyName: ['Nom','Last Name'],
  classe: ['Classe','Classe/Grp'],
};

function pick(r:any, keys:string[]){ for (const k of keys) if (r[k] && String(r[k]).trim()!=='') return String(r[k]).trim(); }

async function main(){
  const args = process.argv.slice(2);
  const fileArg = args.find(a=>a.startsWith('--file='));
  const file = fileArg ? fileArg.split('=')[1] : 'TERMINALE_NSI.csv';
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) throw new Error('CSV introuvable');
  const raw = fs.readFileSync(p,'utf8');
  const cleaned = raw.replace(/<[^>]*>/g,'');
  const rows = parse(cleaned, { columns:true, delimiter:';', skip_empty_lines:true, trim:true, bom:true, relax_column_count:true, relax_quotes:true, escape:'\\' });
  const defaultHash = await argon2.hash('password123');
  let createdUsers=0, linked=0;
  for (const r of rows){
    let email = (pick(r, HEADERS.email)||'').toLowerCase();
    const mailto = email.match(/mailto:([^"'>]+)/i); if (mailto) email = mailto[1].toLowerCase();
    if (!email || !email.endsWith('@ert.tn')) continue;
    const givenName = pick(r, HEADERS.givenName) || '';
    const familyName = pick(r, HEADERS.familyName) || '';
    const classe = pick(r, HEADERS.classe) || '';
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user){
      user = await prisma.user.create({ data: { email, role:'student', passwordHash: defaultHash, mustChangePassword: true } });
      createdUsers++;
    }
    let student = await prisma.student.findUnique({ where: { email } });
    if (!student){
      student = await prisma.student.create({ data: { email, givenName, familyName, classe, specialites:'', active:true } });
    }
    if (!student.userId){
      await prisma.student.update({ where: { id: student.id }, data: { userId: user.id } });
      linked++;
    }
  }
  for (const t of ['alaeddine.benrhouma@ert.tn','pierre.caillabet@ert.tn']){
    const email = t.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user){
      user = await prisma.user.create({ data: { email, role:'teacher', passwordHash: defaultHash, mustChangePassword: true } });
    }
    let teacher = await prisma.teacher.findUnique({ where: { email } });
    if (!teacher){
      teacher = await prisma.teacher.create({ data: { email, givenName:'', familyName:'' } });
    }
    if (!teacher.userId){
      await prisma.teacher.update({ where: { id: teacher.id }, data: { userId: user.id } });
    }
  }
  console.log(`Seed users terminé. users_crees=${createdUsers} liens_student=${linked}`);
}

main().finally(()=>prisma.$disconnect());

