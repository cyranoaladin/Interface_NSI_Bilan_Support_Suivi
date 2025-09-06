import './globals.css';
import Providers from './providers';
export const metadata = { title: "Nexus Réussite", description: "Plateforme NSI" };
export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="fr"><body className="min-h-screen"><Providers>{children}</Providers></body></html>
  );
}
