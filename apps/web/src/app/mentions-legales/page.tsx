"use client";

import React from "react";
import { PremiumCard } from "@/components/ui/PremiumCard";

export default function MentionsLegales() {
    return (
        <PremiumCard variant="glass" className="mx-auto max-w-3xl p-8">
            <h1 className="text-3xl font-display gradient-text mb-6">
                Mentions légales
            </h1>
            <section className="space-y-4 text-[var(--text-primary)]">
                <p><strong>Éditeur :</strong> NSI PMF – Plateforme de Mentorat et Formation – 2025.</p>
                <p><strong>Hébergement :</strong> Infra Docker (PostgreSQL, Redis, MinIO) exécutée sur les serveurs de l’établissement.</p>
                <p><strong>Responsable de la protection des données :</strong> contact@nsipmf.org.</p>
                <p><strong>Propriété intellectuelle :</strong> Tous les contenus (textes, graphiques, code) sont la propriété exclusive de NSI PMF, sauf mention contraire.</p>
                {/* Ajoutez le texte complet de vos mentions légales ici */}
            </section>
        </PremiumCard>
    );
}
