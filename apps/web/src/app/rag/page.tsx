"use client";

import { useState } from "react";

export default function RagPage() {
  const [q, setQ] = useState("");
  const [k, setK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setResults([]);
    try {
      const url = `/api/rag/search?q=${encodeURIComponent(q)}&k=${k}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data.results || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Recherche RAG</h1>
      <form onSubmit={onSearch} className="space-y-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Votre question (ex: méthodes de travail en NSI)"
          className="w-full border rounded px-3 py-2"
          required
        />
        <div className="flex items-center gap-3">
          <label className="text-sm">Top K</label>
          <input
            type="number"
            className="w-20 border rounded px-2 py-1"
            value={k}
            min={1}
            max={50}
            onChange={(e) => setK(Number(e.target.value))}
          />
          <button
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Recherche…" : "Rechercher"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 text-red-600">Erreur: {error}</div>
      )}

      <div className="mt-6 space-y-4">
        {results.map((r, i) => (
          <div key={i} className="border rounded p-3">
            <div className="text-sm text-gray-600">{r.label} — {r.path}</div>
            <pre className="whitespace-pre-wrap text-sm mt-2">{r.preview}</pre>
            <div className="text-xs text-gray-500 mt-1">distance: {Number(r.distance).toFixed(4)}</div>
          </div>
        ))}
        {results.length === 0 && !loading && !error && (
          <div className="text-gray-500 text-sm">Aucun résultat pour le moment.</div>
        )}
      </div>
    </div>
  );
}
