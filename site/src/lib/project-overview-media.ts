export type OverviewLocale = "en" | "zh-cn";

export interface OverviewStageSpec {
  index: number;
  code: string;
  startSeconds: number;
  endSeconds: number;
  badgeEn: string;
  badgeZh: string;
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  hrefEn: string;
  hrefZh: string;
  ctaEn: string;
  ctaZh: string;
}

export interface ProjectOverviewMedia {
  durationSeconds: 15;
  width: 1280;
  height: 760;
  poster: string;
  mp4: string;
  webm: string;
  gif: string;
  stages: OverviewStageSpec[];
}

export const OVERVIEW_STAGES: OverviewStageSpec[] = [
  {
    index: 0,
    code: "01",
    startSeconds: 0,
    endSeconds: 3,
    badgeEn: "01 · Four Coupled Artefacts",
    badgeZh: "01 · 四层耦合架构",
    titleEn: "One discovery question connects curriculum, resources, code, and report",
    titleZh: "一个药物发现问题串联课程、资源图谱、代码实验与动态报告",
    summaryEn:
      "Every claim routes across the 18-track curriculum, 232-record Atlas, 56 CPU-first labs, and 94-page living report.",
    summaryZh:
      "每一项科学陈述都双向锚定 18 轨道课程、232 条资源图谱、56 个 CPU 优先实验与 94 页动态报告。",
    hrefEn: "/report/",
    hrefZh: "/zh-cn/report/",
    ctaEn: "Inspect architecture",
    ctaZh: "查看系统架构",
  },
  {
    index: 1,
    code: "02",
    startSeconds: 3,
    endSeconds: 6,
    badgeEn: "02 · 18-Track Curriculum (93/93)",
    badgeZh: "02 · 18 轨道课程（93/93 实测）",
    titleEn: "93/93 curriculum units backed by real-data assessments",
    titleZh: "93/93 个课程主题全部配备真实数据核验与评估",
    summaryEn:
      "Prerequisite-linked tracks progress from assay framing and molecular representations to 3D physics, generation, and candidate nomination.",
    summaryZh:
      "前置依赖图谱从测定定义与分子表示一路推进到 3D 物理建模、生成设计与候选分子提名。",
    hrefEn: "/learn/",
    hrefZh: "/zh-cn/learn/",
    ctaEn: "Explore 18 tracks",
    ctaZh: "浏览 18 条轨道",
  },
  {
    index: 2,
    code: "03",
    startSeconds: 6,
    endSeconds: 9,
    badgeEn: "03 · 232-Record Evidence Atlas",
    badgeZh: "03 · 232 条证据资源图谱",
    titleEn: "Seven technical openness dimensions recorded separately from licence",
    titleZh: "七维技术开放性与访问许可逐项分离审计",
    summaryEn:
      "Inference code, training code, weights, architecture, data recipe, training data, and evaluation code carry dated primary-source receipts.",
    summaryZh:
      "推理代码、训练代码、模型权重、架构细节、数据配方、训练数据与评测代码各自保留带日期的一手证据记录。",
    hrefEn: "/atlas/",
    hrefZh: "/atlas/",
    ctaEn: "Open Resource Atlas",
    ctaZh: "打开资源图谱",
  },
  {
    index: 3,
    code: "04",
    startSeconds: 9,
    endSeconds: 12,
    badgeEn: "04 · 56 CPU-First Real-Data Labs",
    badgeZh: "04 · 56 个 CPU 真实数据实验",
    titleEn: "Frozen protocols retain negative results and assay-transfer ranking flips",
    titleZh: "冻结协议完整保留阴性结果与跨测定基线排名反转",
    summaryEn:
      "ChEMBL 37 EGFR (n=132 vs n=170), PDB 1M17 3D coordinates, FreeSolv, and rMD17 run on CPU without overwriting locked baselines.",
    summaryZh:
      "ChEMBL 37 EGFR（n=132 对 n=170）、PDB 1M17 3D 口袋坐标、FreeSolv 与 rMD17 在 CPU 上直接运行且不覆盖锁定结果。",
    hrefEn: "/labs/",
    hrefZh: "/zh-cn/labs/",
    ctaEn: "Run CPU labs",
    ctaZh: "打开 CPU 实验",
  },
  {
    index: 4,
    code: "05",
    startSeconds: 12,
    endSeconds: 15,
    badgeEn: "05 · 13-System Audit & Living Report",
    badgeZh: "05 · 13 系统审计与动态报告",
    titleEn: "13 providers × 93 topics audited with explicit evidence bounds",
    titleZh: "13 个系统 × 93 个主题的透明证据上下界对标",
    summaryEn:
      "Direct real-data verification across all 93 topics alongside 20 publication-grade figures and a reproducible 94-page PDF report.",
    summaryZh:
      "93 个主题全部完成直接真实数据核验，配套 20 张出版级科学图件与可复现 94 页 PDF 技术报告。",
    hrefEn: "/comparisons/",
    hrefZh: "/zh-cn/comparisons/",
    ctaEn: "Read 13-system audit",
    ctaZh: "阅读 13 系统对标",
  },
];

export const projectOverviewMedia = (
  locale: OverviewLocale,
): ProjectOverviewMedia => {
  const stem = `/media/overview/aidd-commons-overview-${locale}`;
  return {
    durationSeconds: 15,
    width: 1280,
    height: 760,
    poster: `${stem}.webp`,
    mp4: `${stem}.mp4`,
    webm: `${stem}.webm`,
    gif: `${stem}.gif`,
    stages: OVERVIEW_STAGES,
  };
};
