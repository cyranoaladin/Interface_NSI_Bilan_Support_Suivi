import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Layout } from '@/components/ui/Layout';

export default function Dashboard() {
  return (
    <Layout sidebar={<div>
      <h2 className="text-lg">Espace</h2>
      <p className="text-sm text-[var(--fg)]/70">Bienvenue</p>
    </div>}>
      <Card>
        <CardHeader>
          <h1 className="text-2xl">Dashboard</h1>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--fg)]/80">Votre bilan sera disponible ici une fois généré.</p>
        </CardContent>
      </Card>
    </Layout>
  );
}
