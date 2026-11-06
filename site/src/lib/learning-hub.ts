/** Navigation over declared curriculum IDs; completion remains self-reported. */
export type LearningStep = {
  id: string;
  title: string;
  href: string;
  prerequisiteIds: string[];
};

export type LearningRoute = {
  id: string;
  title: string;
  lessonIds: string[];
  prerequisiteIds: string[];
};

export type NextLearningStep = {
  id: string;
  reason: "route-prerequisite" | "lesson-prerequisite" | "next";
} | null;

export function learningProgress(lessonIds: string[], completed: string[]) {
  const ids = [...new Set(lessonIds)];
  const done = new Set(completed);
  return {
    completed: ids.filter((id) => done.has(id)).length,
    total: ids.length,
  };
}

/** Resolve prerequisite leaves without crediting or mutating any lesson. */
export function nextLearningStep(
  route: Pick<LearningRoute, "lessonIds" | "prerequisiteIds">,
  lessons: Pick<LearningStep, "id" | "prerequisiteIds">[],
  completed: string[],
): NextLearningStep {
  const done = new Set(completed);
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const prerequisiteLeaf = (
    id: string,
    visiting = new Set<string>(),
  ): string => {
    if (visiting.has(id)) return id;
    const nextVisiting = new Set([...visiting, id]);
    for (const prerequisite of byId.get(id)?.prerequisiteIds ?? []) {
      if (!done.has(prerequisite))
        return prerequisiteLeaf(prerequisite, nextVisiting);
    }
    return id;
  };

  const prerequisite = route.prerequisiteIds.find((id) => !done.has(id));
  if (prerequisite) {
    return { id: prerequisiteLeaf(prerequisite), reason: "route-prerequisite" };
  }
  const next = route.lessonIds.find((id) => !done.has(id));
  if (!next) return null;
  const id = prerequisiteLeaf(next);
  return { id, reason: id === next ? "next" : "lesson-prerequisite" };
}

/** Keep browser payloads scoped to this route and its declared prerequisites. */
export function learningStepClosure(
  routes: Pick<LearningRoute, "lessonIds" | "prerequisiteIds">[],
  lessons: LearningStep[],
): LearningStep[] {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const selected = new Set<string>();
  const visit = (id: string) => {
    if (selected.has(id)) return;
    const lesson = byId.get(id);
    if (!lesson) return;
    selected.add(id);
    lesson.prerequisiteIds.forEach(visit);
  };
  routes.forEach((route) =>
    [...route.prerequisiteIds, ...route.lessonIds].forEach(visit),
  );
  return lessons.filter((lesson) => selected.has(lesson.id));
}
