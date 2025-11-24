export type DatasetKey =
  | "bibliotheque"
  | "cinema"
  | "reseau"
  | "velo"
  | "classe";

export interface DatasetEntry {
  key: DatasetKey;
  label: string;
  csv: string[];
  ddl: string;
  imports: string[];
  e2e: string | null;
}

export interface StudentModuleResource {
  label: string;
  href: string;
}

export interface StudentModule {
  id: string;
  title: string;
  duration: string;
  focus: string;
  keyPoints: string[];
  resources?: StudentModuleResource[];
}

export interface MethodCard {
  title: string;
  tips: string[];
  cta?: { label: string; href: string; };
}

export interface QuizQuestionSet {
  id: string;
  title: string;
  description: string;
  questions: string[];
  resources?: StudentModuleResource[];
}

export interface PackBuilderResource {
  href: string;
  target: string;
  type?: "text" | "binary";
}

export interface PackBuilderSolutionMap {
  [key: string]: string | null;
}

export interface BaseDocumentResource extends PackBuilderResource {}

export interface ProjectTrackDataset {
  label: string;
  href: string;
}

export interface ProjectTrack {
  title: string;
  goal: string;
  milestones: string[];
  deliverables: string[];
  datasets: ProjectTrackDataset[];
}

export interface MocodoTemplate {
  theme: string;
  filename: string;
  instructions: string;
  template: string;
}

export interface StudentTool {
  title: string;
  id: string;
  items: string[];
  action?: { label: string; href: string; };
}

export interface AutoEvalChecklistBlock {
  title: string;
  items: string[];
}

export interface ResourceDirectoryEntry {
  category: string;
  items: StudentModuleResource[];
}

export interface TeacherSession {
  phase: string;
  duration: string;
  objectives: string[];
  teacherMoves: string[];
}

export interface TeacherResourceGroup {
  title: string;
  description: string;
  items: StudentModuleResource[];
}

export interface EvaluationTool {
  title: string;
  description: string;
  href: string;
}

export interface ScenarioExercise {
  question: string;
  hint: string;
  solution: string;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  schema: string;
  exercises: ScenarioExercise[];
}

export interface HealthCheckLibrary {
  [key: string]: string[];
}

export interface E2ESnippetLibrary {
  [key: string]: string;
}

export interface SolutionOverrideState {
  scenarios: Record<string, boolean | null>;
  projects: string | null;
}
