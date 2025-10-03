describe('/api/auth/login handler (smoke)', () => {
  it('exports POST', async () => {
    const fs = require('fs');
    const path = require('path');
    const txt = fs.readFileSync(path.resolve(__dirname, '../login/route.ts'), 'utf8');
    expect(txt).toMatch(/export\s+async\s+function\s+POST/);
  });
});
