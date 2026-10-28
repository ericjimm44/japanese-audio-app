/**
 * Course registry: every lesson, compiled once. Lessons are content in
 * /content, versioned with the code.
 */
import { compileLesson } from "./engine/compile.ts";
import type { CompiledLesson, Item, Lesson } from "./engine/types.ts";
import l01 from "../content/ja/level1/01.ts";
import l02 from "../content/ja/level1/02.ts";

export const LESSONS: Lesson[] = [l01, l02];

/** Every item in the course, so later lessons can recall earlier items. */
export const ITEM_INDEX: Map<string, Item> = new Map(
  LESSONS.flatMap((l) => l.items.map((it) => [it.id, it] as const)),
);

const compiled = new Map<string, CompiledLesson>();

export function getCompiled(id: string): CompiledLesson | undefined {
  const cached = compiled.get(id);
  if (cached) return cached;
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) return undefined;
  const c = compileLesson(lesson, ITEM_INDEX);
  compiled.set(id, c);
  return c;
}

export function lessonDurationS(id: string): number {
  return getCompiled(id)?.durationS ?? 0;
}
