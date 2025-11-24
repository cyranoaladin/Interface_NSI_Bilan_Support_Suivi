import dynamic from 'next/dynamic';

const TeacherProgramClient = dynamic(() => import('./teacher/TeacherProgramClient'), { ssr: false });

export const metadata = { title: 'Programme & ressources • Enseignant' };

export default function Page() {
  return <TeacherProgramClient />;
}
