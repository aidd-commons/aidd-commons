export type OverviewLocale = "en" | "zh-cn";

export interface OverviewStageSpec {
  index: number;
  code: string;
  startSeconds: number;
  endSeconds: number;
  shortEn: string;
  shortZh: string;
  badgeEn: string;
  badgeZh: string;
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  subphasesEn: [string, string, string];
  subphasesZh: [string, string, string];
  hrefEn: string;
  hrefZh: string;
  ctaEn: string;
  ctaZh: string;
}

export interface ProjectOverviewMedia {
  durationSeconds: 120;
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
    endSeconds: 12,
    shortEn: "01 · Artefacts",
    shortZh: "01 · 四层架构",
    badgeEn: "01 · Four Coupled Artefacts (0:00–0:12)",
    badgeZh: "01 · 四层双向耦合架构 (0:00–0:12)",
    titleEn: "Why AIDD Commons couples curriculum, resource Atlas, CPU labs, and living report",
    titleZh: "为什么要把 18 轨道课程、232 资源图谱、56 实验与 94 页报告耦合为一体",
    summaryEn:
      "Disconnected notebooks and unverified openness claims break reproducibility. Every claim here routes across Learn, Atlas, Labs, and Report via shared IDs.",
    summaryZh:
      "孤立的脚本与未经核验的“开源”标签难以支撑真实药物发现。平台通过共享实体 ID 将课程、图谱、实验与报告双向锁定。",
    subphasesEn: [
      "1A · Problem: Disconnected tutorials & unverified claims",
      "1B · Architecture: Learn ↔ Atlas ↔ Labs ↔ Report loop",
      "1C · Contract: Shared resource IDs & correction routes",
    ],
    subphasesZh: [
      "1A · 痛点：孤立教程、隐性泄漏与未核验的开源宣称",
      "1B · 架构：课程 ↔ 资源图谱 ↔ CPU 实验 ↔ 动态报告闭环",
      "1C · 契约：共享资源 ID 与基于一手证据的纠错回流",
    ],
    hrefEn: "/report/",
    hrefZh: "/zh-cn/report/",
    ctaEn: "Inspect architecture",
    ctaZh: "查看系统架构",
  },
  {
    index: 1,
    code: "02",
    startSeconds: 12,
    endSeconds: 24,
    shortEn: "02 · Evidence",
    shortZh: "02 · 证据纪律",
    badgeEn: "02 · Epistemic & Evidence Discipline (0:12–0:24)",
    badgeZh: "02 · 认识论边界与证据纪律 (0:12–0:24)",
    titleEn: "Four statement classes separate observed measurements from expectations",
    titleZh: "四类陈述严格区分实测结果、协议契约、理论预期与未核验问题",
    summaryEn:
      "No number enters the platform without its machine, software version, split protocol, and date. Unknown metadata stays explicitly unverified.",
    summaryZh:
      "任何数值必须附带硬件环境、软件版本、划分协议与核验日期；未知或不可达信息一律显式标记为 unverified。",
    subphasesEn: [
      "2A · Four Classes: Observed · Contract · Expectation · Open",
      "2B · Provenance: Machine, version, split & verification date",
      "2C · Loop: Build → Review → Measure accountability",
    ],
    subphasesZh: [
      "2A · 四类陈述：实测数据 · 协议契约 · 理论预期 · 开放问题",
      "2B · 溯源要素：硬件环境、软件版本、划分协议与核验日期",
      "2C · 闭环验证：构建 (Build) → 审查 (Review) → 实测 (Measure)",
    ],
    hrefEn: "/report/figures/statement-classes/",
    hrefZh: "/zh-cn/report/figures/statement-classes/",
    ctaEn: "Read evidence rules",
    ctaZh: "查看证据规范",
  },
  {
    index: 2,
    code: "03",
    startSeconds: 24,
    endSeconds: 36,
    shortEn: "03 · Pipeline",
    shortZh: "03 · 发现流程",
    badgeEn: "03 · Target-to-Candidate Decision Pipeline (0:24–0:36)",
    badgeZh: "03 · 从靶点到候选分子的决策流水线 (0:24–0:36)",
    titleEn: "Nine scientific stages from biological target framing to candidate nomination",
    titleZh: "九大科学决策阶段串联从靶点机制、测定标准化到多参数候选提名",
    summaryEn:
      "Follows how biological assays become standardized chemical tables, 2D/3D representations, physics trajectories, generative designs, and nomination packets.",
    summaryZh:
      "沿着真实药物研发脉络：靶点与疾病生物学 → 测定协议与化学标准化 → 分子表示与 3D 物理 → 生成设计与主动学习 → 候选分子提名。",
    subphasesEn: [
      "3A · Upstream: Target biology, assay endpoint & parent structure",
      "3B · Core Modelling: 2D/3D representations, co-folding & MD physics",
      "3C · Translation: Generation, active learning, synthesis & nomination",
    ],
    subphasesZh: [
      "3A · 上游定义：靶点生物学、测定端点与母核化学实体标准化",
      "3B · 核心建模：2D/3D 分子表示、生物大分子共折叠与分子动力学",
      "3C · 下游转化：受控生成、主动学习预算、逆合成与多目标提名",
    ],
    hrefEn: "/report/figures/decision-pipeline/",
    hrefZh: "/zh-cn/report/figures/decision-pipeline/",
    ctaEn: "Explore pipeline",
    ctaZh: "查看决策流水线",
  },
  {
    index: 3,
    code: "04",
    startSeconds: 36,
    endSeconds: 48,
    shortEn: "04 · 18 Tracks",
    shortZh: "04 · 18 轨道",
    badgeEn: "04 · 18-Track Curriculum & 93/93 Assessed Units (0:36–0:48)",
    badgeZh: "04 · 18 轨道课程与 93/93 真实数据实测单元 (0:36–0:48)",
    titleEn: "111 bilingual chapters across 18 prerequisite-linked tracks (100% assessed)",
    titleZh: "18 条前置依赖轨道、111 篇双语章节与 93/93 真实数据核验主题",
    summaryEn:
      "Every curriculum topic reaches assessed + real-data depth with explicit biological framing, interactive mechanisms, runnable CPU checks, and failure modes.",
    summaryZh:
      "全部 93 个课程主题均达到 Assessed + Real-Data 最高标准，配备六个背景入口路线（核心主线、生物化学、AI 计算、数据治理、物理建模与转化）。",
    subphasesEn: [
      "4A · Curriculum Graph: 18 tracks & explicit prerequisites",
      "4B · 100% Depth: All 93/93 topics real-data assessed",
      "4C · Six Routes: Tailored entry paths by reader background",
    ],
    subphasesZh: [
      "4A · 课程依赖图：18 条主题轨道与显式前置知识图谱",
      "4B · 100% 实测深度：93/93 主题全部配备真实数据核验与评分契约",
      "4C · 六条学习路线：按生物学、AI 计算与工程背景定制进入路径",
    ],
    hrefEn: "/learn/",
    hrefZh: "/zh-cn/learn/",
    ctaEn: "Explore 18 tracks",
    ctaZh: "浏览 18 条轨道",
  },
  {
    index: 4,
    code: "05",
    startSeconds: 48,
    endSeconds: 60,
    shortEn: "05 · 232 Atlas",
    shortZh: "05 · 资源图谱",
    badgeEn: "05 · 232-Record Evidence Atlas & Access Tiers (0:48–1:00)",
    badgeZh: "05 · 232 条证据资源图谱与访问许可分层 (0:48–1:00)",
    titleEn: "Models, datasets, benchmarks, databases, and tools audited with primary sources",
    titleZh: "覆盖 84 个模型、59 个工具、27 个基准与 36 个数据集/库的一手证据图谱",
    summaryEn:
      "Separates lifecycle status, access tier, and legal licence across 232 records, supporting side-by-side comparison of 2–4 resources without JavaScript lock-in.",
    summaryZh:
      "在 232 条记录中逐项分离生命周期状态、访问层级与开源许可证，支持 2–4 项资源的并排证据对比与全静态检索。",
    subphasesEn: [
      "5A · Registry: 84 models, 59 tools, 27 benchmarks, 36 datasets/DBs",
      "5B · Governance: Access tier separated from legal licence",
      "5C · Workbench: Side-by-side 2–4 resource comparison",
    ],
    subphasesZh: [
      "5A · 图谱构成：84 个模型、59 个软件工具、27 个基准与 36 个数据库/集",
      "5B · 合规分层：访问方式（公开/注册/受限）与许可证条款严格解耦",
      "5C · 对比工作台：支持 2–4 项资源并排核验复用条件与一手引文",
    ],
    hrefEn: "/atlas/",
    hrefZh: "/atlas/",
    ctaEn: "Open Resource Atlas",
    ctaZh: "打开资源图谱",
  },
  {
    index: 5,
    code: "06",
    startSeconds: 60,
    endSeconds: 72,
    shortEn: "06 · Openness",
    shortZh: "06 · 七维开放",
    badgeEn: "06 · Seven-Dimension Technical Openness Audit (1:00–1:12)",
    badgeZh: "06 · 七维工程开放性解耦审计 (1:00–1:12)",
    titleEn: "Inference code (93%) does not imply open training data (36%) or data recipes (35%)",
    titleZh: "推理代码公开（93%）不等于训练数据（36%）或数据清洗配方（35%）可复现",
    summaryEn:
      "Audits inference code, training code, weights, architecture, data recipe, training data, and evaluation code separately across every resource class.",
    summaryZh:
      "将推理代码、训练代码、模型权重、架构细节、数据配方、训练数据与评测代码拆分为七个独立证据字段，杜绝笼统的“开源”标签。",
    subphasesEn: [
      "6A · Seven Fields: Inference, training, weights, arch, recipe, data, eval",
      "6B · Model Gap: 78/84 inference code vs 29/84 data recipe",
      "6C · Honest States: Available · Unavailable · Unverified · N/A",
    ],
    subphasesZh: [
      "6A · 七维拆解：推理、训练、权重、架构、数据配方、训练数据、评测代码",
      "6B · 实证落差：84 个模型中 78 个公开推理代码，仅 29 个公开数据配方",
      "6C · 四态证据：明确区分可用、不可用、未核验 (unverified) 与不适用",
    ],
    hrefEn: "/report/figures/openness-matrix/",
    hrefZh: "/zh-cn/report/figures/openness-matrix/",
    ctaEn: "Inspect 7 dimensions",
    ctaZh: "查看七维开放性",
  },
  {
    index: 6,
    code: "07",
    startSeconds: 72,
    endSeconds: 84,
    shortEn: "07 · CPU Labs",
    shortZh: "07 · 冻结实验",
    badgeEn: "07 · 56 CPU-First Labs & Frozen Evaluation Lifecycle (1:12–1:24)",
    badgeZh: "07 · 56 个 CPU 优先实验与冻结评测生命周期 (1:12–1:24)",
    titleEn: "Protocol lock and test-boundary discipline prevent post-hoc retuning",
    titleZh: "协议锁定与测试边界隔离（Test Boundary）杜绝事后调参和数据泄漏",
    summaryEn:
      "Every lab names its execution mode up front: Read Retained Results, Fresh Reproduction, or Editable Student Exercise writing to an isolated folder.",
    summaryZh:
      "每个实验显式区分三类执行模式：阅读冻结结果、独立完整复现、学生可编辑练习（输出至独立目录，绝不覆盖作者锁定基线）。",
    subphasesEn: [
      "7A · Lifecycle: Protocol Lock → Split Audit → One-Shot Test Eval",
      "7B · FreeSolv (n=642): Scaffold vs random split calibration drift",
      "7C · Three Modes: Retained · Reproduction · Isolated Student Run",
    ],
    subphasesZh: [
      "7A · 生命周期：协议锁定 → 划分审计 → 开发集选择 → 单次锁定测试",
      "7B · FreeSolv (n=642)：骨架划分与随机划分的误差及校准漂移实证",
      "7C · 三模式隔离：阅读保留结果 · 独立复现 · 学生隔离目录练习",
    ],
    hrefEn: "/labs/",
    hrefZh: "/zh-cn/labs/",
    ctaEn: "Open 56 CPU labs",
    ctaZh: "打开 56 个实验",
  },
  {
    index: 7,
    code: "08",
    startSeconds: 84,
    endSeconds: 96,
    shortEn: "08 · Rank Flips",
    shortZh: "08 · 排名反转",
    badgeEn: "08 · Retained Adverse Evidence: EGFR & CYP Assay Transfer (1:24–1:36)",
    badgeZh: "08 · 保留反面证据：EGFR 与 CYP 跨测定排名反转 (1:24–1:36)",
    titleEn: "Why the #1 model on the primary EGFR split flips to #3 on a separate assay",
    titleZh: "为什么 ChEMBL 37 EGFR 主划分第一名模型在独立测定复现中跌至第三名",
    summaryEn:
      "Morgan Ridge wins primary EGFR (n=132, MAE 0.418) but fails on assay replication (n=170, MAE 3.132, Spearman -0.041). Negative results stay visible.",
    summaryZh:
      "Morgan Ridge 在主划分（n=132）排名第一（MAE 0.418），但在独立测定（n=170）跌至末位（MAE 3.132，Spearman -0.041）。阴性结果作为核心教学内容完整保留。",
    subphasesEn: [
      "8A · Primary EGFR (n=132): Morgan Ridge wins (MAE 0.418, ρ=0.505)",
      "8B · Assay Replication (n=170): Ranking inverts (MAE 3.132, ρ=-0.041)",
      "8C · Multi-Assay Reality: CYP2D6/3A4 & PDB 1M17 3D pocket checks",
    ],
    subphasesZh: [
      "8A · 主划分 (n=132)：Morgan Ridge 拔得头筹 (MAE 0.418, ρ=0.505)",
      "8B · 独立测定 (n=170)：排名发生反转 (MAE 3.132, ρ=-0.041)",
      "8C · 跨测定现实：CYP 测定分歧与 PDB 1M17 真实 3D 口袋结构核验",
    ],
    hrefEn: "/labs/chembl-egfr-representation-baselines/",
    hrefZh: "/zh-cn/labs/chembl-egfr-representation-baselines/",
    ctaEn: "Inspect EGFR flip",
    ctaZh: "检查 EGFR 排名反转",
  },
  {
    index: 8,
    code: "09",
    startSeconds: 96,
    endSeconds: 108,
    shortEn: "09 · Physics/AL",
    shortZh: "09 · 物理与AL",
    badgeEn: "09 · 3D Trajectory Physics (rMD17) & Pool-Budget Active Learning (1:36–1:48)",
    badgeZh: "09 · rMD17 分子动力学统计与主动学习池预算 (1:36–1:48)",
    titleEn: "Autocorrelated MD frames and shared acquisition labels require explicit guards",
    titleZh: "自相关动力学轨迹与跨实验共享标签必须配备显式统计与防泄漏护栏",
    summaryEn:
      "Demonstrates block-averaged error bars on rMD17 trajectories (T11) and 5-seed acquisition recovery curves under explicit prior-exposure disclosure (T15).",
    summaryZh:
      "展示 rMD17 轨迹自相关下的分块误差棒校正（T11），以及 5 随机种子主动学习采集策略恢复曲线与历史标签暴露披露（T15）。",
    subphasesEn: [
      "9A · Track 11 (rMD17): Autocorrelation & block-averaged error bars",
      "9B · Track 15 (Pool Budget): Ensemble variance vs maxmin vs random",
      "9C · Provenance Guard: Disclosing shared T15/T05 label access",
    ],
    subphasesZh: [
      "9A · T11 轨迹物理：rMD17 时间自相关校正与分块统计误差棒",
      "9B · T15 主动学习：集成方差、最大最小多样性与 5 种子随机基线对标",
      "9C · 审计透明度：如实披露 T15 对 T05 共享标签的历史访问边界",
    ],
    hrefEn: "/report/figures/acquisition-policy-recovery/",
    hrefZh: "/zh-cn/report/figures/acquisition-policy-recovery/",
    ctaEn: "Inspect T11 & T15",
    ctaZh: "查看物理与主动学习",
  },
  {
    index: 9,
    code: "10",
    startSeconds: 108,
    endSeconds: 120,
    shortEn: "10 · 13-Systems",
    shortZh: "10 · 系统对标",
    badgeEn: "10 · 13-System Coverage Audit & Reproducible Release (1:48–2:00)",
    badgeZh: "10 · 13 系统 × 93 主题覆盖审计与全栈可复现交付 (1:48–2:00)",
    titleEn: "1,209 audited cells across 13 public systems with 93/93 direct real-data evidence",
    titleZh: "13 个公开系统 × 93 个主题（1,209 审计格）上下界对标与全栈自动化验证",
    summaryEn:
      "Replaces composite leaderboards with transparent lower/upper bounds, backed by 1,267 Python tests, 922 bilingual pages, and a 94-page v0.2 living report.",
    summaryZh:
      "用透明证据上下界取代黑盒综合排行榜，全栈通过 1,267 项 Python 测试、922 页双语站点构建、94 页 v0.2 PDF 报告与零卫生违规校验。",
    subphasesEn: [
      "10A · 13×93 Matrix: Lower/upper bounds across 4 provider classes",
      "10B · Blind Sandbox: 54 topics verified in isolation (problems=0)",
      "10C · Full Verification: 1,267 pytest · 922 pages · 94-page PDF",
    ],
    subphasesZh: [
      "10A · 13×93 审计矩阵：四类提供方的证据上下界区间而非单分榜单",
      "10B · 盲审沙箱复核：54 个新增实测主题隔离运行零违规通过",
      "10C · 全栈交付门禁：1,267 项测试 · 922 页双语网页 · 94 页报告 PDF",
    ],
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
    durationSeconds: 120,
    width: 1280,
    height: 760,
    poster: `${stem}.webp`,
    mp4: `${stem}.mp4`,
    webm: `${stem}.webm`,
    gif: `${stem}.gif`,
    stages: OVERVIEW_STAGES,
  };
};
