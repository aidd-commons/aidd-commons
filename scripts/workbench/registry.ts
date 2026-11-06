import { z } from "zod";

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const qualifiedLesson = z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/u);
const text = z.string().trim().min(1);
const sourcePath = text.refine(
  (value) =>
    /^(?:labs|catalog|site\/src\/content\/docs)\//u.test(value) &&
    !value
      .split("/")
      .some((part) => part === ".." || part === "." || part === ""),
  "must name a canonical repository source, without traversal",
);
const source = z.object({ id, path: sourcePath, label: text }).strict();
const caseSchema = z
  .object({
    id,
    title: text,
    titleZh: text,
    summary: text,
    summaryZh: text,
    labSlug: id,
    trackIds: z.array(id).min(1),
    lessonIds: z.array(qualifiedLesson),
    entity: text,
    entityZh: text,
    population: text,
    populationZh: text,
    unit: z.enum(["pChEMBL", "kcal/mol", "fraction"]),
    comparison: text,
    comparisonZh: text,
    interpretation: text,
    interpretationZh: text,
    protocol: source,
    result: source.extend({
      datePointer: text.regex(/^\//u),
      dataPointer: text.regex(/^\//u),
    }),
    viewIds: z.array(id).min(1),
  })
  .strict();
const viewSchema = z
  .object({
    id,
    caseId: id,
    adapter: z.enum(["egfr-mae", "rmd17-mae", "pool-recovery"]),
    question: text,
    questionZh: text,
    quantity: text,
    unit: z.enum(["pChEMBL", "kcal/mol", "fraction"]),
    encoding: text,
    interaction: text,
    caption: text,
    captionZh: text,
    tableAnchor: id,
  })
  .strict();

export const workbenchRegistrySchema = z
  .object({
    version: z.literal(1),
    cases: z.array(caseSchema).min(1),
    views: z.array(viewSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const cases = new Map(value.cases.map((item) => [item.id, item]));
    const views = new Map(value.views.map((item) => [item.id, item]));
    for (const [field, items] of [
      ["cases", value.cases],
      ["views", value.views],
    ] as const) {
      if (new Set(items.map(({ id }) => id)).size !== items.length)
        context.addIssue({
          code: "custom",
          path: [field],
          message: "must have unique IDs",
        });
    }
    for (const [index, item] of value.cases.entries()) {
      for (const viewId of item.viewIds) {
        if (views.get(viewId)?.caseId !== item.id)
          context.addIssue({
            code: "custom",
            path: ["cases", index, "viewIds"],
            message: `unresolved or mismatched view: ${viewId}`,
          });
      }
    }
    for (const [index, item] of value.views.entries()) {
      const owner = cases.get(item.caseId);
      if (!owner?.viewIds.includes(item.id))
        context.addIssue({
          code: "custom",
          path: ["views", index, "caseId"],
          message: "must resolve to a case declaring this view",
        });
      const expectedUnit = {
        "egfr-mae": "pChEMBL",
        "rmd17-mae": "kcal/mol",
        "pool-recovery": "fraction",
      }[item.adapter];
      if (item.unit !== expectedUnit || owner?.unit !== expectedUnit)
        context.addIssue({
          code: "custom",
          path: ["views", index, "unit"],
          message: `adapter and case require unit ${expectedUnit}`,
        });
    }
  });

export type WorkbenchRegistry = z.infer<typeof workbenchRegistrySchema>;

export function parseWorkbenchRegistry(value: unknown): WorkbenchRegistry {
  const result = workbenchRegistrySchema.safeParse(value);
  if (!result.success)
    throw new Error(
      result.error.issues
        .map(
          (issue) =>
            `workbench registry: ${issue.path.join(".")}: ${issue.message}`,
        )
        .join("\n"),
    );
  return result.data;
}

/** Resolve JSON pointers strictly, including escaped property names. */
export function atPointer(value: unknown, pointer: string): unknown {
  if (pointer === "") return value;
  if (!pointer.startsWith("/"))
    throw new Error(`Invalid JSON source pointer: ${pointer}`);
  let current = value;
  for (const part of pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.hasOwn(current, part)
    )
      throw new Error(`Unresolved JSON source pointer: ${pointer}`);
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
