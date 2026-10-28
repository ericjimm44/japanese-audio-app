import { notFound } from "next/navigation";
import { LESSONS } from "@/lib/content";
import { Player } from "@/components/player";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ id: l.id }));
}

export default function LessonPage({ params }: { params: { id: string } }) {
  if (!LESSONS.some((l) => l.id === params.id)) notFound();
  return <Player lessonId={params.id} />;
}
