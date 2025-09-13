import './globals.css';
import Providers from './providers';
export const metadata = { title: "NSI-PMF", description: "Plateforme NSI", icons: { icon: '/icon.svg' } };
export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="fr"><body className="min-h-screen"><Providers>{children}</Providers></body></html>
  );
}
