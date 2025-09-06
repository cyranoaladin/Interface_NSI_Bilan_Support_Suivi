import * as React from 'react';
import { Header } from './Header';
import { ToastProvider } from './Toast';

export function Layout({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode; }) {
  return (
    <ToastProvider>
      <Header />
      <div className="min-h-[calc(100vh-56px)] grid grid-cols-12">
        <aside className="col-span-12 md:col-span-3 xl:col-span-2 border-r border-white/10 bg-[#0f1723]">
          <div className="p-4">
            {sidebar}
          </div>
        </aside>
        <main className="col-span-12 md:col-span-9 xl:col-span-10">
          <div className="container py-8">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
