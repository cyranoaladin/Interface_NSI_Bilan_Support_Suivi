describe('/api/auth/login handler (smoke)', () => {
  it('exports POST', async () => {
    const txt = await import('fs').then(fs => fs.readFileSync(require('path').resolve(__dirname, '../login/route.ts'), 'utf8'));
    expect(txt).toMatch(/export\s+async\s+function\s+POST/);
  });
});
