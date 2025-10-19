'use client';

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { Layout } from '@/components/ui/Layout';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { useToast } from '@/components/ui/Toast';
import {
  autoEvalChecklist,
  datasetCatalog,
  e2eSnippets,
  evaluationScenarios,
  evaluationTools,
  healthCheckLibrary,
  methodCards,
  mocodoTemplates,
  projectTracks,
  quizSets,
  resourceDirectory,
  studentModules,
  studentTools,
  teacherResourceGroups,
  teacherSessions
} from '@/features/bdd-nsi';
import {
  Role,
  SharedStateSnapshot,
  composeStudentUrl,
  initializeSharedState,
  persistSharedState,
  syncUrlWithState
} from '@/features/bdd-nsi/shared-state';
import {
  buildQuizPayloads,
  manifestForDataset,
  packBuilderCommonDocs,
  packBuilderTeacherDocs,
  resourcesForDataset,
  uniquePackResources
} from '@/features/bdd-nsi/pack-builder';

const resolveAssetHref = (href: string): string => {
  if (!href) return '#';
  if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return href;
  if (href.startsWith('/NSI/BDD_NSI/')) return href;
  const trimmed = href.replace(/^\/+/, '');
  return `/NSI/BDD_NSI/${trimmed}`;
};

const Section = ({ id, title, description, children }: { id: string; title: string; description?: React.ReactNode; children: React.ReactNode; }) => (
  <section id={id} className="space-y-4">
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-[var(--fg)]/70">{description}</p>}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </section>
);

const Card = ({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; }) => (
  <div className="space-y-3 rounded-xl border border-white/10 bg-[#101926] p-4">
    <div>
      <h3 className="text-lg font-medium">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-[var(--fg)]/60">{subtitle}</p>}
    </div>
    <div className="space-y-2 text-sm text-[var(--fg)]/80">
      {children}
    </div>
  </div>
);

const ResourceLink = ({ href, children }: { href: string; children: React.ReactNode; }) => {
  const resolved = resolveAssetHref(href);
  const isAnchor = resolved.startsWith('#');
  const openInNewTab = resolved.startsWith('/NSI/BDD_NSI/') || resolved.startsWith('http');
  return (
    <a
      href={resolved}
      className="inline-flex items-center gap-2 text-sm text-electric hover:underline"
      target={openInNewTab && !isAnchor ? '_blank' : undefined}
      rel={openInNewTab && !isAnchor ? 'noopener noreferrer' : undefined}
    >
      {children}
      {!isAnchor && <span className="text-xs text-[var(--fg)]/60">[ouvrir]</span>}
    </a>
  );
};

const toDurationLabel = (value?: string) => (value ? `${value}` : undefined);

export default function BddNsiHubPage() {
  const { push } = useToast();
  const [state, setState] = React.useState<SharedStateSnapshot>(() => initializeSharedState());
  const [datasetSource, setDatasetSource] = React.useState<'officiel' | 'personnalise'>('officiel');
  const [copiedShareUrl, setCopiedShareUrl] = React.useState(false);
  const [copiedManifest, setCopiedManifest] = React.useState(false);

  const selectedDataset = React.useMemo(
    () => datasetCatalog.find((entry) => entry.key === state.dataset) ?? datasetCatalog[0],
    [state.dataset]
  );
  const datasetResources = React.useMemo(
    () => uniquePackResources(resourcesForDataset(state.dataset)),
    [state.dataset]
  );
  const manifest = React.useMemo(
    () => manifestForDataset(state.dataset, datasetSource),
    [state.dataset, datasetSource]
  );
  const quizPayloads = React.useMemo(() => buildQuizPayloads(), []);

  React.useEffect(() => {
    persistSharedState(state);
    syncUrlWithState(state);
  }, [state]);

  const updateRole = React.useCallback((role: Role) => {
    setState((prev) => ({ ...prev, role, showSolutions: role === 'eleve' ? false : prev.showSolutions }));
  }, []);

  const updateDataset = React.useCallback((evt: React.ChangeEvent<HTMLSelectElement>) => {
    const value = evt.target.value;
    setState((prev) => ({ ...prev, dataset: value as typeof prev.dataset }));
  }, []);

  const toggleSolutions = React.useCallback(() => {
    if (state.role === 'eleve') return;
    setState((prev) => ({ ...prev, showSolutions: !prev.showSolutions }));
  }, [state.role]);

  const sidebarItems = React.useMemo(() => {
    const base = [
      { href: '#overview', label: 'Présentation' },
      { href: '#dataset', label: 'Jeux de données' },
      { href: '#health', label: 'Vérifications' },
      { href: '#scenarios', label: 'Scénarios' },
      { href: '#documents', label: 'Documents' }
    ];
    if (state.role === 'eleve') {
      base.splice(1, 0,
        { href: '#modules', label: 'Parcours' },
        { href: '#outils', label: 'Outils' },
        { href: '#projets', label: 'Projets' },
        { href: '#quiz', label: 'Quiz' }
      );
    } else {
      base.splice(1, 0,
        { href: '#sessions', label: 'Séances' },
        { href: '#enseignant-ressources', label: 'Ressources prof' },
        { href: '#pack-builder', label: 'Pack builder' },
        { href: '#evaluation', label: 'Évaluation' }
      );
    }
    return base;
  }, [state.role]);

  const handleShare = React.useCallback(async () => {
    const url = composeStudentUrl(state);
    if (!url) {
      push({ message: 'Impossible de générer le lien partagé', variant: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShareUrl(true);
      push({ message: 'Lien élève copié', variant: 'success' });
      window.setTimeout(() => setCopiedShareUrl(false), 2000);
    } catch (error) {
      push({ message: 'Copie du lien impossible', variant: 'error' });
    }
  }, [push, state]);

  const handleCopyManifest = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(manifest);
      setCopiedManifest(true);
      push({ message: 'Manifest copié', variant: 'success' });
      window.setTimeout(() => setCopiedManifest(false), 2000);
    } catch (error) {
      push({ message: 'Impossible de copier le manifest', variant: 'error' });
    }
  }, [manifest, push]);

  return (
    <Layout
      sidebar={<div className="space-y-4">
        <div>
          <h2 className="text-lg font-poppins">Hub BDD NSI</h2>
          <p className="text-xs text-[var(--fg)]/60">{state.role === 'eleve' ? 'Espace élève' : 'Espace enseignant'}</p>
        </div>
        <SidebarNav items={sidebarItems} />
      </div>}
      right={<div className="flex items-center gap-2">
        <Button variant={state.role === 'eleve' ? 'primary' : 'ghost'} onClick={() => updateRole('eleve')}>Espace élève</Button>
        <Button variant={state.role === 'enseignant' ? 'primary' : 'ghost'} onClick={() => updateRole('enseignant')}>Espace enseignant</Button>
      </div>}
    >
      <div className="space-y-12">
        <section id="overview" className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-electric/80">Séquence BDD NSI</p>
            <h1 className="text-3xl font-semibold">Ressources MERISE, SQL et projets data pour la Terminale NSI</h1>
            <p className="max-w-3xl text-[var(--fg)]/80">Ce hub rassemble les parcours élèves, les guides enseignants et les ressources téléchargeables issues du projet BDD NSI. Choisissez votre rôle, un jeu de données et lancez la préparation de vos séances.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#101926] p-4">
              <p className="text-sm text-[var(--fg)]/70">Jeu de données sélectionné</p>
              <h3 className="text-xl font-semibold">{selectedDataset?.label}</h3>
              <select value={state.dataset} onChange={updateDataset} className="w-full rounded-xl border border-white/10 bg-[#0b1320] px-3 py-2 text-sm focus:outline-none">
                {datasetCatalog.map((entry) => (
                  <option key={entry.key} value={entry.key}>{entry.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#101926] p-4">
              <p className="text-sm text-[var(--fg)]/70">Solutions</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{state.showSolutions ? 'Affichées' : 'Masquées'}</span>
                <Button variant="secondary" onClick={toggleSolutions} disabled={state.role === 'eleve'}>
                  {state.showSolutions ? 'Masquer' : 'Afficher'}
                </Button>
              </div>
              {state.role === 'eleve' && <p className="text-xs text-[var(--fg)]/60">Les solutions restent désactivées côté élève.</p>}
            </div>
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#101926] p-4">
              <p className="text-sm text-[var(--fg)]/70">Lien élève instantané</p>
              <Button variant="primary" className="w-full" onClick={handleShare}>Copier le lien élève</Button>
              <p className="text-xs text-[var(--fg)]/60">Le lien force le mode élève et masque les solutions pour « {selectedDataset?.label} ».</p>
              {copiedShareUrl && <p className="text-xs text-green-300">Lien copié.</p>}
            </div>
          </div>
        </section>

        {state.role === 'eleve' && (
          <>
            <Section id="modules" title="Parcours élève" description="Séquence progressive en quatre blocs — besoins, modélisation, SQL et analyse.">
              <div className="grid gap-4 md:grid-cols-2">
                {studentModules.map((module) => (
                  <Card key={module.id} title={module.title} subtitle={`${module.focus}${module.duration ? ` · ${toDurationLabel(module.duration)}` : ''}`}>
                    <ul className="list-inside list-disc space-y-1">
                      {module.keyPoints.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                    {module.resources && module.resources.length > 0 && (
                      <div className="border-t border-white/10 pt-2">
                        <p className="mb-1 text-xs text-[var(--fg)]/60">Raccourcis</p>
                        <ul className="space-y-1">
                          {module.resources.map((resource) => (
                            <li key={resource.href}>
                              <ResourceLink href={resource.href}>{resource.label}</ResourceLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="outils" title="Outils et méthodes" description="Fiches réflexes, checklist MERISE et banque de questions pour l’autonomie.">
              <div id="methodes" className="grid gap-4 md:grid-cols-3">
                {methodCards.map((card) => (
                  <Card key={card.title} title={card.title}>
                    <ul className="list-inside list-disc space-y-1">
                      {card.tips.map((tip) => <li key={tip}>{tip}</li>)}
                    </ul>
                    {card.cta && (
                      <div className="border-t border-white/10 pt-2">
                        <ResourceLink href={card.cta.href}>{card.cta.label}</ResourceLink>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              <div id="outils-mcd" className="grid gap-4 md:grid-cols-3">
                {studentTools.map((tool) => (
                  <Card key={tool.id} title={tool.title}>
                    <ul className="list-inside list-disc space-y-1">
                      {tool.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                    {tool.action && (
                      <div className="border-t border-white/10 pt-2">
                        <ResourceLink href={tool.action.href}>{tool.action.label}</ResourceLink>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              <div id="auto-eval" className="grid gap-4 md:grid-cols-3">
                {autoEvalChecklist.map((block) => (
                  <Card key={block.title} title={block.title}>
                    <ul className="list-inside list-disc space-y-1">
                      {block.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="projets" title="Projets data" description="Scénarios concrets pour approfondir et préparer l’évaluation sommative.">
              <div className="grid gap-4 md:grid-cols-3">
                {projectTracks.map((project) => (
                  <Card key={project.title} title={project.title} subtitle={project.goal}>
                    <div>
                      <p className="text-xs text-[var(--fg)]/60 uppercase">jalons</p>
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        {project.milestones.map((milestone) => <li key={milestone}>{milestone}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--fg)]/60 uppercase">livrables</p>
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        {project.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}
                      </ul>
                    </div>
                    <div className="border-t border-white/10 pt-2">
                      <p className="mb-1 text-xs text-[var(--fg)]/60">Datasets</p>
                      <ul className="space-y-1">
                        {project.datasets.map((dataset) => (
                          <li key={dataset.href}>
                            <ResourceLink href={dataset.href}>{dataset.label}</ResourceLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                ))}
              </div>

              <div id="outils-mocodo" className="grid gap-4 md:grid-cols-3">
                {mocodoTemplates.map((template) => (
                  <Card key={template.filename} title={template.theme} subtitle={template.instructions}>
                    <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs">{template.template}</pre>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="quiz" title="Quiz auto-correctifs" description="Banque de questions flash pour entretenir les acquis.">
              <div className="grid gap-4 md:grid-cols-3">
                {quizSets.map((quiz) => (
                  <Card key={quiz.id} title={quiz.title} subtitle={quiz.description}>
                    <ul className="list-inside list-disc space-y-1">
                      {quiz.questions.map((question) => <li key={question}>{question}</li>)}
                    </ul>
                    {quiz.resources && quiz.resources.length > 0 && (
                      <div className="border-t border-white/10 pt-2">
                        <p className="mb-1 text-xs text-[var(--fg)]/60">Liens utiles</p>
                        <ul className="space-y-1">
                          {quiz.resources.map((resource) => (
                            <li key={resource.href}>
                              <ResourceLink href={resource.href}>{resource.label}</ResourceLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Section>
          </>
        )}

        {state.role === 'enseignant' && (
          <>
            <Section id="sessions" title="Déroulé pédagogique" description="Trois séances clés en main pour lancer, animer et évaluer la séquence.">
              <div className="grid gap-4 md:grid-cols-3">
                {teacherSessions.map((session) => (
                  <Card key={session.phase} title={session.phase} subtitle={session.duration}>
                    <div>
                      <p className="text-xs text-[var(--fg)]/60 uppercase">objectifs</p>
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        {session.objectives.map((objective) => <li key={objective}>{objective}</li>)}
                      </ul>
                    </div>
                    <div className="border-t border-white/10 pt-2">
                      <p className="text-xs text-[var(--fg)]/60 uppercase">moments clés</p>
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        {session.teacherMoves.map((move) => <li key={move}>{move}</li>)}
                      </ul>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="enseignant-ressources" title="Bibliothèque enseignant" description="Imports SQL, corrections et scripts de vérification.">
              <div className="grid gap-4 md:grid-cols-3">
                {teacherResourceGroups.map((group) => (
                  <Card key={group.title} title={group.title} subtitle={group.description}>
                    <ul className="space-y-1">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <ResourceLink href={item.href}>{item.label}</ResourceLink>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="pack-builder" title="Pack builder" description="Préparez un pack autonome (HTML + assets) à partager aux élèves.">
              <div className="space-y-4 rounded-xl border border-white/10 bg-[#101926] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-[var(--fg)]/70">Source des CSV</p>
                    <div className="mt-2 flex gap-2">
                      <Button variant={datasetSource === 'officiel' ? 'primary' : 'ghost'} onClick={() => setDatasetSource('officiel')}>Officiels</Button>
                      <Button variant={datasetSource === 'personnalise' ? 'primary' : 'ghost'} onClick={() => setDatasetSource('personnalise')}>Personnalisés</Button>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleCopyManifest}>
                    {copiedManifest ? 'Manifest copié' : 'Copier le manifest'}
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-xs">{manifest}</pre>
              </div>

              <Card title="Assets inclus" subtitle="Ressources empaquetées pour le dataset choisi.">
                <ul className="space-y-1">
                  {datasetResources.map((resource) => (
                    <li key={resource.target} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm">{resource.href}</span>
                      <ResourceLink href={resource.href}>ouvrir</ResourceLink>
                    </li>
                  ))}
                </ul>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card title="Docs communs">
                  <ul className="space-y-1">
                    {packBuilderCommonDocs.map((doc) => (
                      <li key={doc.href}>
                        <ResourceLink href={doc.href}>{doc.href}</ResourceLink>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card title="Docs enseignants">
                  <ul className="space-y-1">
                    {packBuilderTeacherDocs.map((doc) => (
                      <li key={doc.href}>
                        <ResourceLink href={doc.href}>{doc.href}</ResourceLink>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <Card title="Payloads quiz" subtitle="Export JSON prêt pour l’interface standalone.">
                <div className="space-y-3">
                  {quizPayloads.map(({ quiz, payload }) => (
                    <details key={quiz.id} className="rounded-lg bg-black/20">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{quiz.title}</summary>
                      <pre className="whitespace-pre-wrap px-3 pb-3 text-xs">{payload}</pre>
                    </details>
                  ))}
                </div>
              </Card>
            </Section>

            <Section id="evaluation" title="Évaluation & feedback" description="Grilles, scripts de correction et ressources pour l’oral.">
              <div className="grid gap-4 md:grid-cols-3">
                {evaluationTools.map((tool) => (
                  <Card key={tool.title} title={tool.title} subtitle={tool.description}>
                    <ResourceLink href={tool.href}>Consulter</ResourceLink>
                  </Card>
                ))}
              </div>
            </Section>
          </>
        )}

        <Section id="dataset" title="Structure du dataset" description="CSV, scripts SQL et imports pour le jeu sélectionné.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Fichiers CSV">
              <ul className="space-y-1">
                {selectedDataset?.csv.map((href) => (
                  <li key={href}>
                    <ResourceLink href={href}>{href}</ResourceLink>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Scripts SQL">
              <ul className="space-y-1">
                {selectedDataset?.ddl && (
                  <li>
                    <ResourceLink href={selectedDataset.ddl}>{selectedDataset.ddl}</ResourceLink>
                  </li>
                )}
                {selectedDataset?.imports.map((script) => (
                  <li key={script}>
                    <ResourceLink href={script}>{script}</ResourceLink>
                  </li>
                ))}
                {selectedDataset?.e2e && (
                  <li>
                    <ResourceLink href={selectedDataset.e2e}>{selectedDataset.e2e}</ResourceLink>
                  </li>
                )}
              </ul>
            </Card>
          </div>
        </Section>

        <Section id="health" title="Vérifications rapides" description="Requêtes de contrôle et scripts E2E pour valider les imports.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Requêtes santé">
              <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-xs">{(healthCheckLibrary[state.dataset] || []).join('\n\n')}</pre>
            </Card>
            <Card title="Script E2E">
              <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-xs">{e2eSnippets[state.dataset]}</pre>
            </Card>
          </div>
        </Section>

        <Section id="scenarios" title="Scénarios d’évaluation" description="Énoncés, indices et solutions pour entraîner les élèves.">
          <div className="space-y-4">
            {evaluationScenarios.map((scenario) => (
              <Card key={scenario.id} title={scenario.title} subtitle={scenario.description}>
                <p className="text-xs text-[var(--fg)]/60">Schéma MERISE</p>
                <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs">{scenario.schema}</pre>
                <ul className="space-y-2">
                  {scenario.exercises.map((exercise) => (
                    <li key={exercise.question} className="rounded-lg bg-black/20 p-3">
                      <p className="text-sm font-medium">{exercise.question}</p>
                      <p className="mt-1 text-xs text-[var(--fg)]/60">Indice : {exercise.hint}</p>
                      {state.showSolutions && (
                        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs">{exercise.solution}</pre>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Section>

        <Section id="documents" title="Documents transverses" description="Accès rapide aux CSV, scripts et documents complémentaires.">
          <div className="grid gap-4 md:grid-cols-3">
            {resourceDirectory.map((group) => (
              <Card key={group.category} title={group.category}>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <ResourceLink href={item.href}>{item.label}</ResourceLink>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    </Layout>
  );
}
