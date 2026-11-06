import type { StoryId, StoryLocale } from "./story-media.js";
export interface StoryStep {
  title: string;
  detail: string;
}
export interface ScienceStoryDefinition {
  title: string;
  boundary: string;
  steps: StoryStep[];
}
const select = (locale: StoryLocale, en: string, zh: string) =>
  locale === "zh-cn" ? zh : en;
export function scienceStory(
  story: StoryId,
  locale: StoryLocale,
): ScienceStoryDefinition {
  const t = (en: string, zh: string) => select(locale, en, zh);
  if (story === "evidence")
    return {
      title: t(
        "Follow the evidence, not just the molecule",
        "跟随证据，理解分子的发现之路",
      ),
      boundary: t(
        "Conceptual reading journey. Illustrations are not observed structures, assay results or a validated discovery pipeline.",
        "概念阅读路径。插图不是观测到的结构、测定结果，也不表示经过验证的发现流程。",
      ),
      steps: [
        {
          title: t("Disease context", "疾病语境"),
          detail: t(
            "Start with the biological question and the evidence that could challenge it.",
            "从生物学问题出发，同时寻找可能反驳它的证据。",
          ),
        },
        {
          title: t("Target and structure", "靶点与结构"),
          detail: t(
            "Connect the target, construct and molecular representation. A structure is a hypothesis about state.",
            "连接靶点、构建体与分子表示。结构提供关于状态的假设。",
          ),
        },
        {
          title: t("Assay and endpoint", "测定与端点"),
          detail: t(
            "Ask what was measured, in which context, and under which comparison.",
            "确认测量了什么、测定情境是什么，以及采用何种比较。",
          ),
        },
        {
          title: t("Design and feedback", "设计与反馈"),
          detail: t(
            "Bring synthesis constraints, measurements and failed attempts into the next decision.",
            "把合成约束、测量结果与失败尝试带入下一次决策。",
          ),
        },
        {
          title: t("Inspectable decision", "可检查的决策"),
          detail: t(
            "Link the conclusion back to its evidence and keep the remaining uncertainty visible.",
            "让结论能够追溯到证据，同时保留尚未解决的不确定性。",
          ),
        },
      ],
    };
  if (story === "identity")
    return {
      title: t("Follow the parent across the split", "沿 parent 身份检查划分"),
      boundary: t(
        "Constructed example from T04/T17, not real assay measurements. Parent disjointness alone does not establish independence or a complete scaffold split.",
        "沿用 T04/T17 的构造示例，并非真实测量。Parent 不重叠本身不证明独立性，也不表示完整 scaffold 划分。",
      ),
      steps: [
        {
          title: t("Read the identity", "读取身份"),
          detail: t(
            "A · r1 and A · r2 are two records of parent A. B · r3 belongs to parent B.",
            "A · r1 与 A · r2 是 parent A 的两条记录。B · r3 属于 parent B。",
          ),
        },
        {
          title: t("Expose the row-split defect", "暴露按行划分的缺陷"),
          detail: t(
            "Assigning rows separately puts A · r1 in training and A · r2 in evaluation.",
            "逐行分配使 A · r1 进入训练集合，A · r2 进入评估集合。",
          ),
        },
        {
          title: t("Trace the shared parent", "追踪共享 parent"),
          detail: t(
            "The record IDs differ, but parent A still crosses the evaluation boundary.",
            "记录 ID 不同，但 parent A 仍跨越评估边界。",
          ),
        },
        {
          title: t("Keep the group together", "保留完整组"),
          detail: t(
            "A · r1 and A · r2 move together. B · r3 remains in evaluation; no performance gain is claimed.",
            "A · r1 与 A · r2 保持在一起。B · r3 留在评估集合；本图不声称性能提升。",
          ),
        },
      ],
    };
  return {
    title: t("A decision returns as evidence", "让决策通过证据返回"),
    boundary: t(
      "Conceptual DMTA loop, separate from the empirical pool-budget curves. A completed loop does not establish improvement or successful discovery.",
      "DMTA 概念循环，与真实 pool-budget 曲线分开。完成一次循环不代表性能提升或发现成功。",
    ),
    steps: [
      {
        title: t("Design under constraints", "在约束下设计"),
        detail: t(
          "Choose a candidate and a question that the next experiment can answer.",
          "选择候选对象，并明确下一次实验能够回答的问题。",
        ),
      },
      {
        title: t("Make a feasible attempt", "进行可行的制备尝试"),
        detail: t(
          "Synthesis and practical feasibility constrain which proposed candidates can be tested.",
          "合成与实际可行性约束了哪些候选对象能够进入测定。",
        ),
      },
      {
        title: t("Test and retain failures", "测定并保留失败"),
        detail: t(
          "Record the measurement context, unsuccessful attempts and missing outcomes.",
          "记录测量情境、未成功的尝试与缺失结果。",
        ),
      },
      {
        title: t("Analyze, then decide again", "分析后再次决策"),
        detail: t(
          "Update the decision using the evidence; compare policies under a matched budget.",
          "依据证据更新决策，并在匹配的预算下比较策略。",
        ),
      },
    ],
  };
}
const palette = {
  ink: "#183248",
  teal: "#087e84",
  pale: "#e2efeb",
  coral: "#b35b43",
  muted: "#61737d",
  rule: "#bccdcd",
  paper: "#fffaf2",
};
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const n = (v: number) => Math.round(v * 100) / 100;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (value: number) => {
  const p = Math.max(0, Math.min(1, value));
  return p * p * (3 - 2 * p);
};
function text(x: number, y: number, label: string, size = 18, extra = "") {
  return `<text x="${n(x)}" y="${n(y)}" font-size="${size}" ${extra}>${escape(label)}</text>`;
}
function token(
  x: number,
  y: number,
  label: string,
  parent: "A" | "B",
  emphasis = false,
) {
  const color = emphasis
    ? palette.coral
    : parent === "A"
      ? palette.teal
      : palette.ink;
  return `<g transform="translate(${n(x)} ${n(y)})"><rect width="120" height="46" rx="8" fill="${parent === "A" ? palette.pale : palette.paper}" stroke="${color}" stroke-width="2" ${parent === "B" ? 'stroke-dasharray="5 4"' : ""}/>${text(60, 29, label, 18, `text-anchor="middle" font-weight="600" fill="${color}"`)}</g>`;
}
/** One deterministic native scene function drives both the web and exported frames.
 * artHref is only used by the exporter; the web uses Astro's responsive Image beneath it.
 */
export function renderStoryFrame(
  story: StoryId,
  progress: number,
  locale: StoryLocale,
  narrow = false,
  artHref = "",
): string {
  const p = Number.isFinite(progress)
    ? Math.max(0, Math.min(0.999999, progress))
    : 0;
  const definition = scienceStory(story, locale);
  const index = Math.min(
    definition.steps.length - 1,
    Math.floor(p * definition.steps.length),
  );
  const t = (en: string, zh: string) => select(locale, en, zh);
  const W = narrow ? 480 : 960;
  const H = story === "evidence" ? (narrow ? 260 : 380) : narrow ? 540 : 420;
  let marks = "";
  if (story === "evidence") {
    const artHeight = W / 3;
    if (artHref)
      marks += `<image href="${escape(artHref)}" x="0" y="0" width="${W}" height="${artHeight}" preserveAspectRatio="xMidYMid meet"/>`;
    const y = narrow ? 204 : 314;
    const points = Array.from({ length: 5 }, (_, i) => (W * (i + 0.5)) / 5);
    marks += `<path d="M ${points[0]} ${y} H ${points[4]}" stroke="${palette.rule}" stroke-width="2"/>`;
    const travel = p * 4;
    const dotX = mix(
      points[Math.floor(travel)],
      points[Math.min(4, Math.floor(travel) + 1)],
      travel % 1,
    );
    marks += `<path d="M ${points[0]} ${y} H ${n(dotX)}" stroke="${palette.teal}" stroke-width="3"/><circle cx="${n(dotX)}" cy="${y}" r="9" fill="${palette.teal}" stroke="${palette.paper}" stroke-width="3"/>`;
    definition.steps.forEach((step, i) => {
      const active = i === index;
      marks += `<g opacity="${active ? 1 : 0.68}"><circle cx="${points[i]}" cy="${y}" r="${active ? 18 : 13}" fill="${active ? palette.teal : palette.paper}" stroke="${palette.teal}" stroke-width="2"/>${text(points[i], y + 6, String(i + 1).padStart(2, "0"), narrow ? 18 : 16, `text-anchor="middle" fill="${active ? "white" : palette.teal}" font-weight="700"`)}${narrow ? "" : text(points[i], y + 43, step.title, locale === "zh-cn" ? 19 : 16, 'text-anchor="middle" font-weight="600"')}</g>`;
    });
    const center = points[index];
    marks += `<path d="M ${center} ${y - 29} V ${n(artHeight * 0.7)}" stroke="${palette.teal}" stroke-width="2" stroke-dasharray="3 7" opacity=".55"/><circle cx="${center}" cy="${n(artHeight * 0.7)}" r="${15 + Math.sin(p * Math.PI * 10) * 3}" fill="none" stroke="${palette.teal}" stroke-width="2" opacity=".6"/>`;
  } else if (story === "identity") {
    const xSource = narrow ? 42 : 60;
    const xTrain = narrow ? 286 : 575;
    const xEval = xTrain;
    const yTrain = narrow ? 100 : 98;
    const yEval = narrow ? 335 : 265;
    const start = [
      [xSource, 100],
      [xSource, 170],
      [xSource, 240],
    ];
    const row = [
      [xTrain, yTrain],
      [xEval, yEval],
      [xEval + (narrow ? 0 : 145), yEval + (narrow ? 64 : 0)],
    ];
    const group = [
      [xTrain, yTrain],
      [xTrain + (narrow ? 0 : 145), yTrain + (narrow ? 64 : 0)],
      row[2],
    ];
    const local = p * 4;
    const firstMove = smooth((local - 0.45) / 0.65);
    const secondMove = smooth((local - 2.65) / 0.65);
    const coords = start.map((point, i) => [
      mix(mix(point[0], row[i][0], firstMove), group[i][0], secondMove),
      mix(mix(point[1], row[i][1], firstMove), group[i][1], secondMove),
    ]);
    marks += text(
      xSource,
      52,
      t("SOURCE RECORDS", "来源记录"),
      narrow ? 19 : 16,
      `fill="${palette.muted}" letter-spacing="1"`,
    );
    marks += `<path d="M ${narrow ? 245 : 520} 65 V ${H - 28}" stroke="${palette.rule}" stroke-width="1"/>`;
    marks += text(
      xTrain,
      52,
      t("TRAINING", "训练集合"),
      narrow ? 19 : 16,
      `fill="${palette.teal}" font-weight="700"`,
    );
    marks += text(
      xTrain,
      narrow ? 293 : 224,
      t("EVALUATION", "评估集合"),
      narrow ? 19 : 16,
      `fill="${palette.ink}" font-weight="700"`,
    );
    marks += `<path d="M ${narrow ? 264 : 554} ${narrow ? 251 : 191} H ${W - 23}" stroke="${index === 2 ? palette.coral : palette.rule}" stroke-width="2" stroke-dasharray="6 6"/>`;
    marks += `<path d="M ${xSource + 135} 148 H ${narrow ? 224 : 475}" stroke="${palette.rule}" stroke-width="2" marker-end="url(#story-${story}-${narrow ? "narrow" : "wide"}-arrow)"/>`;
    if (index >= 1 && index <= 2) {
      const x = xTrain + 60;
      marks += `<path d="M ${x} ${yTrain + 46} C ${x - 75} ${yTrain + 100}, ${x - 75} ${yEval - 50}, ${x} ${yEval}" fill="none" stroke="${palette.coral}" stroke-width="${index === 2 ? 3 : 2}" stroke-dasharray="5 5"/>`;
      marks += text(
        narrow ? 34 : 60,
        narrow ? 390 : 330,
        t("SAME PARENT", "同一 PARENT"),
        narrow ? 21 : 19,
        `fill="${palette.coral}" font-weight="700"`,
      );
      marks += text(
        narrow ? 34 : 60,
        narrow ? 423 : 362,
        t("crosses the boundary", "跨越集合边界"),
        narrow ? 18 : 17,
        `fill="${palette.coral}"`,
      );
    } else if (index === 3) {
      marks += text(
        narrow ? 34 : 60,
        narrow ? 390 : 330,
        t("PARENT A TOGETHER", "PARENT A 保持完整"),
        narrow ? 19 : 19,
        `fill="${palette.teal}" font-weight="700"`,
      );
      marks += text(
        narrow ? 34 : 60,
        narrow ? 423 : 362,
        t("membership preserved", "保留成员归属"),
        narrow ? 18 : 17,
        `fill="${palette.muted}"`,
      );
    }
    coords.forEach(([x, y], i) => {
      marks += token(
        x,
        y,
        ["A · r1", "A · r2", "B · r3"][i],
        i === 2 ? "B" : "A",
        index === 2 && i < 2,
      );
    });
    if (firstMove > 0.7)
      marks += `<g opacity="${n((firstMove - 0.7) / 0.3)}">${text(xSource, 116, "A", 36, `fill="${palette.teal}" font-weight="700"`)}${text(xSource, 149, t("parent identity", "parent 身份"), narrow ? 18 : 16, `fill="${palette.muted}"`)}</g>`;
  } else {
    const cx = W / 2;
    const cy = narrow ? 280 : 218;
    const rx = narrow ? 160 : 330;
    const ry = narrow ? 175 : 125;
    const positions = [
      [cx - rx, cy - ry],
      [cx + rx, cy - ry],
      [cx + rx, cy + ry],
      [cx - rx, cy + ry],
    ];
    const labels = [
      t("DESIGN", "设计"),
      t("MAKE", "制备"),
      t("TEST", "测定"),
      t("ANALYZE", "分析"),
    ];
    marks += `<path d="M ${cx - rx} ${cy - ry} H ${cx + rx} V ${cy + ry} H ${cx - rx} Z" fill="none" stroke="${palette.rule}" stroke-width="2" stroke-linejoin="round"/>`;
    for (let i = 0; i < 4; i++) {
      const a = positions[i],
        b = positions[(i + 1) % 4];
      const mx = (a[0] + b[0]) / 2,
        my = (a[1] + b[1]) / 2;
      const angle = i * 90;
      marks += `<path d="M -6 -5 L 2 0 L -6 5" transform="translate(${mx} ${my}) rotate(${angle})" fill="none" stroke="${palette.teal}" stroke-width="2"/>`;
    }
    const part = p * 4;
    const from = positions[index],
      to = positions[(index + 1) % 4];
    marks += `<circle cx="${n(mix(from[0], to[0], part % 1))}" cy="${n(mix(from[1], to[1], part % 1))}" r="7" fill="${palette.coral}"/>`;
    positions.forEach(([x, y], i) => {
      marks += `<g transform="translate(${x} ${y})"><circle r="${narrow ? 50 : 57}" fill="${palette.paper}" stroke="${index === i ? palette.teal : palette.rule}" stroke-width="${index === i ? 3 : 1}"/>`;
      if (i === 0)
        marks += `<path d="M -23 -12 L -23 13 L -1 26 L 21 13 L 21 -12 L -1 -25 Z M -15 -8 V 8 M -1 18 L 13 10 M 13 -8 L -1 -17 M 21 -12 L 33 -20" fill="none" stroke="${palette.teal}" stroke-width="2.5"/>`;
      if (i === 1)
        marks += `<path d="M -9 -29 H 9 M -5 -29 V -5 L -26 25 Q -28 30 -20 30 H 20 Q 28 30 26 25 L 5 -5 V -29 M -16 12 H 16" fill="none" stroke="${palette.teal}" stroke-width="2.5"/><path d="M -14 16 L -20 26 H 20 L 14 16Z" fill="${palette.pale}"/>`;
      if (i === 2) {
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 3; col++)
            marks += `<circle cx="${-19 + col * 19}" cy="${-20 + row * 19}" r="6" fill="${row === 1 && col === 2 ? palette.paper : palette.pale}" stroke="${row === 1 && col === 2 ? palette.coral : palette.teal}" stroke-width="1.7" ${row === 1 && col === 2 ? 'stroke-dasharray="2 2"' : ""}/>`;
      }
      if (i === 3)
        marks += `<path d="M -23 -30 H 13 L 25 -18 V 30 H -23 Z M 13 -30 V -18 H 25 M -13 -8 H 13 M -13 3 H 13 M -13 14 H 3" fill="none" stroke="${palette.teal}" stroke-width="2"/><path d="M 6 20 L 12 25 L 23 12" fill="none" stroke="${palette.coral}" stroke-width="2"/>`;
      marks +=
        text(
          0,
          narrow ? -65 : -75,
          labels[i],
          narrow ? 22 : 19,
          `text-anchor="middle" fill="${index === i ? palette.teal : palette.muted}" font-weight="700"`,
        ) + "</g>";
    });
    marks += text(
      cx,
      cy - 12,
      t("EVIDENCE", "证据"),
      narrow ? 24 : 27,
      `text-anchor="middle" fill="${palette.ink}" font-weight="700"`,
    );
    marks += text(
      cx,
      cy + 22,
      t("returns to the decision", "返回下一次决策"),
      18,
      `text-anchor="middle" fill="${palette.muted}"`,
    );
    marks += text(
      cx,
      cy + 50,
      t("retain failed attempts", "保留失败尝试"),
      narrow ? 18 : 17,
      `text-anchor="middle" fill="${palette.coral}"`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escape(definition.title)}" style="display:block;width:100%;height:auto;font-family:Arial,'PingFang SC','Noto Sans CJK SC',sans-serif;color:${palette.ink}"><defs><marker id="story-${story}-${narrow ? "narrow" : "wide"}-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="${palette.rule}" stroke-width="1.4"/></marker></defs>${marks}</svg>`;
}
