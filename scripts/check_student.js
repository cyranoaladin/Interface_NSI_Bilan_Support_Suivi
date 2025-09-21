const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    await p.$connect();
    const email = process.env.EMAIL || 'alaeddine.benrhouma+eleve_term@ert.tn';
    const st = await p.student.findUnique({ where: { email } });
    console.log('student.exists=', !!st, st ? { email: st.email, groupId: st.groupId } : null);
    const groups = await p.group.findMany({ select: { code: true, id: true } });
    console.log('groups=', groups);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
