import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  OVERVIEW_STAGES,
  type OverviewLocale,
} from "../src/lib/project-overview-media.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const outDir = resolve(scriptDir, "../public/media/overview");
const figuresDir = resolve(scriptDir, "../public/figures");

const WIDTH = 1280;
const HEIGHT = 760;
const RENDER_FPS = 4;
const OUTPUT_FPS = 12;
const STAGE_SECONDS = 12;
const TOTAL_SECONDS = OVERVIEW_STAGES.length * STAGE_SECONDS; // 120 seconds (2:00)
const TOTAL_FRAMES = TOTAL_SECONDS * RENDER_FPS; // 480 rendered frames per locale

const esc = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const loadFigureBase64 = async (fileName: string): Promise<string> => {
  const fullPath = join(figuresDir, fileName);
  const bytes = await sharp(fullPath)
    .resize({ width: 960, withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:image/png;base64,${bytes.toString("base64")}`;
};

const figureUris = await Promise.all([
  loadFigureBase64("schematic-01-artifacts.png"),
  loadFigureBase64("schematic-02-statement-classes.png"),
  loadFigureBase64("schematic-03-decision-pipeline.png"),
  loadFigureBase64("schematic-05-prerequisite-graph.png"),
  loadFigureBase64("plot-1-registry-composition.png"),
  loadFigureBase64("plot-6-openness-matrix.png"),
  loadFigureBase64("schematic-07-frozen-lifecycle.png"),
  loadFigureBase64("plot-9-representation-ranking-flips.png"),
  loadFigureBase64("plot-10-acquisition-policy-recovery.png"),
  loadFigureBase64("plot-2-coverage-bounds.png"),
]);

const formatTime = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

interface ChapterLeftSpec {
  headerEn: string;
  headerZh: string;
  figLabelEn: string;
  figLabelZh: string;
  cards: Array<{
    tag: string;
    titleEn: string;
    titleZh: string;
    detailEn: string;
    detailZh: string;
    metricEn: string;
    metricZh: string;
    color: string;
  }>;
  footerEn: string;
  footerZh: string;
}

const CHAPTER_SPECS: ChapterLeftSpec[] = [
  // Chapter 01 (0:00-0:12)
  {
    headerEn: "CHAPTER 01 · FOUR-ARTEFACT COUPLED ARCHITECTURE",
    headerZh: "第 01 章 · 四层双向耦合系统架构",
    figLabelEn: "FIGURE 01 · FOUR-ARTEFACT LOOP & SHARED RESOURCE IDS (S1)",
    figLabelZh: "图 01 · 四层耦合制品与共享资源 ID 闭环 (S1)",
    cards: [
      {
        tag: "1A · PROBLEM",
        titleEn: "Why Disconnected Tutorials Fail",
        titleZh: "为什么孤立的教程脚本难以复用",
        detailEn: "Isolated notebooks hide split leakage, assay drift, and licence locks.",
        detailZh: "孤立脚本往往掩盖划分泄漏、测定漂移与许可限制。",
        metricEn: "4 Coupled Layers",
        metricZh: "4 层耦合制品",
        color: "#0b6e69",
      },
      {
        tag: "1B · COUPLED SYSTEM",
        titleEn: "Learn ↔ Atlas ↔ Labs ↔ Living Report",
        titleZh: "课程 ↔ 资源图谱 ↔ 实验 ↔ 动态报告",
        detailEn: "18 tracks, 232 Atlas records, 56 CPU labs, and a 94-page report.",
        detailZh: "18 轨道课程、232 条资源记录、56 个实验与 94 页报告。",
        metricEn: "1,905 Links",
        metricZh: "1,905 条关联",
        color: "#2b5c8f",
      },
      {
        tag: "1C · CORRECTION LOOP",
        titleEn: "Shared IDs & Source-Backed Updates",
        titleZh: "共享实体 ID 与一手证据纠错回流",
        detailEn: "Fixing one source record updates lessons, lab checks, and report tables.",
        detailZh: "修正一条底层证据记录即可同步更新课程、实验与报告表格。",
        metricEn: "100% Traceable",
        metricZh: "100% 溯源闭环",
        color: "#5b437a",
      },
    ],
    footerEn: "Every lesson claim traces to an Atlas record, executable lab, and report table.",
    footerZh: "核心契约：任何课程论断均双向锚定图谱记录、可执行实验与报告证据表。",
  },
  // Chapter 02 (0:12-0:24)
  {
    headerEn: "CHAPTER 02 · EPISTEMIC & EVIDENCE DISCIPLINE",
    headerZh: "第 02 章 · 认识论边界与四类科学陈述",
    figLabelEn: "FIGURE 02 · FOUR STATEMENT CLASSES & VERIFICATION LOOP (S2)",
    figLabelZh: "图 02 · 四类科学陈述与构建-审查-实测闭环 (S2)",
    cards: [
      {
        tag: "2A · STATEMENT TAXONOMY",
        titleEn: "Observed vs Contract vs Expectation vs Open",
        titleZh: "严格区分实测、契约、理论预期与开放问题",
        detailEn: "Never conflate a hypothesis or literature claim with a measured lab result.",
        detailZh: "绝不把文献宣称或理论预期混同于本地复现实验的实测结果。",
        metricEn: "4 Classes",
        metricZh: "4 类陈述隔离",
        color: "#0b6e69",
      },
      {
        tag: "2B · MEASUREMENT RECEIPT",
        titleEn: "Hardware, Version, Split & Verification Date",
        titleZh: "硬件环境、软件版本、划分协议与核验日期",
        detailEn: "Every reported metric names the exact CPU/OS, package version, and date.",
        detailZh: "每一个报告数值均记录运行机器、依赖版本、数据划分与日期。",
        metricEn: "Zero Unanchored #",
        metricZh: "零无源裸奔数值",
        color: "#2b5c8f",
      },
      {
        tag: "2C · HONEST UNKNOWNS",
        titleEn: "Unknown Metadata Stays Explicitly Unverified",
        titleZh: "未知或不可达信息显式保持 Unverified",
        detailEn: "Paywalled recipes or missing licences are recorded as unverified, never guessed.",
        detailZh: "未公开的数据配方或缺失条款如实标为 unverified，绝不猜测。",
        metricEn: "Build→Review→Measure",
        metricZh: "构建→审查→实测",
        color: "#8b4c24",
      },
    ],
    footerEn: "Automated tests verify software contracts; human reader outcomes stay not observed.",
    footerZh: "自动化测试仅证明软件与数据契约；人类读者学习成效保持 not observed。",
  },
  // Chapter 03 (0:24-0:36)
  {
    headerEn: "CHAPTER 03 · TARGET-TO-CANDIDATE DECISION PIPELINE",
    headerZh: "第 03 章 · 从靶点机制到候选分子提名的决策流水线",
    figLabelEn: "FIGURE 03 · NINE-STAGE DISCOVERY & MODELLING PIPELINE (S3)",
    figLabelZh: "图 03 · 九阶段药物发现与建模决策流水线 (S3)",
    cards: [
      {
        tag: "3A · UPSTREAM FRAMING",
        titleEn: "Target Biology, Assay Endpoint & Parent Entity",
        titleZh: "靶点生物学、测定端点与母核化学实体标准化",
        detailEn: "Separate salt forms, tautomers, IC50 vs Ki, and assay confidence before modelling.",
        detailZh: "在建模前严格区分盐型、互变异构体、IC50/Ki 与测定置信度。",
        metricEn: "Tracks T01–T04, T06",
        metricZh: "轨道 T01–T04, T06",
        color: "#0b6e69",
      },
      {
        tag: "3B · REPRESENTATION & 3D PHYSICS",
        titleEn: "Fingerprints, 3D Co-Folding & MD Trajectories",
        titleZh: "分子指纹、3D 共折叠结构与分子动力学采样",
        detailEn: "Connect 2D baselines (Morgan/Ridge) to 3D pockets (1M17) and rMD17 dynamics.",
        detailZh: "从 2D 指纹基线延伸至 PDB 1M17 真实口袋与 rMD17 动力学轨迹。",
        metricEn: "Tracks T05, T07–T11",
        metricZh: "轨道 T05, T07–T11",
        color: "#2b5c8f",
      },
      {
        tag: "3C · DESIGN & NOMINATION",
        titleEn: "Generation, Active Learning, Synthesis & TPP",
        titleZh: "受控生成、主动学习、逆合成路线与候选提名",
        detailEn: "Filter generative candidates by validity, retrosynthesis, ADMET, and Pareto gates.",
        detailZh: "通过化学有效性、逆合成可行性、ADMET 与帕累托门禁筛选候选物。",
        metricEn: "Tracks T12–T18",
        metricZh: "轨道 T12–T18",
        color: "#5b437a",
      },
    ],
    footerEn: "Interactive workflow navigator lets readers inspect inputs, failure modes, and labs per stage.",
    footerZh: "主页交互式工作流导航支持按阶段检查输入对象、失败模式与配套实验。",
  },
  // Chapter 04 (0:36-0:48)
  {
    headerEn: "CHAPTER 04 · 18 TRACKS & 93/93 ASSESSED DEPTH",
    headerZh: "第 04 章 · 18 轨道课程与 93/93 实测单元",
    figLabelEn: "FIGURE 10 · 18-TRACK PREREQUISITE GRAPH & ROUTES (S5)",
    figLabelZh: "图 10 · 18 轨道前置依赖图谱与六条学习路径 (S5)",
    cards: [
      {
        tag: "4A · PREREQUISITE GRAPH",
        titleEn: "18 Connected Tracks & 111 Bilingual Pages",
        titleZh: "18 条前置依赖轨道与 111 篇中英双语章节",
        detailEn: "Every lesson declares upstream prerequisites and downstream decision units.",
        detailZh: "每节课程显式声明前置依赖单元、关联资源记录与下游决策任务。",
        metricEn: "18 Tracks · 111 Pages",
        metricZh: "18 轨道 · 111 章节",
        color: "#0b6e69",
      },
      {
        tag: "4B · 100% REAL-DATA ASSESSED",
        titleEn: "All 93/93 Topics Upgraded to Assessed + Real Data",
        titleZh: "全部 93/93 课程主题达到真实数据实测与评分深度",
        detailEn: "Backed by committed PDB, ChEMBL, SKEMPI, rMD17, USPTO, and PK datasets.",
        detailZh: "全部配备 PDB、ChEMBL、SKEMPI、rMD17、USPTO 与药代动力学实测核验。",
        metricEn: "93 / 93 (100%)",
        metricZh: "93 / 93 (100% 实测)",
        color: "#2b5c8f",
      },
      {
        tag: "4C · SIX ENTRY ROUTES",
        titleEn: "Role-Specific Pathways Without Forced Linear Order",
        titleZh: "六条按学科背景定制的进入路线",
        detailEn: "Core spine plus routes for wet-lab biologists, ML engineers, and 3D modellers.",
        detailZh: "提供核心主线及面向实验生物学、AI 算法、数据治理与物理建模的专属路线。",
        metricEn: "6 Guided Routes",
        metricZh: "6 条定制路线",
        color: "#8b4c24",
      },
    ],
    footerEn: "Lesson header strips expose track step, capability badges, objectives, and prerequisites.",
    footerZh: "所有课程顶部均内置契约信息条：直接展示轨道步骤、实测徽章、学习目标与前置知识。",
  },
  // Chapter 05 (0:48-1:00)
  {
    headerEn: "CHAPTER 05 · 232-RECORD ATLAS & LICENCE TIERS",
    headerZh: "第 05 章 · 232 条证据图谱与访问许可分层",
    figLabelEn: "FIGURE 05 · ATLAS REGISTRY COMPOSITION BY KIND & ACCESS (P1)",
    figLabelZh: "图 05 · 232 条资源图谱类型构成与访问层级分布 (P1)",
    cards: [
      {
        tag: "5A · REGISTRY COMPOSITION",
        titleEn: "84 Models · 59 Tools · 27 Benchmarks · 36 DB/Datasets",
        titleZh: "84 模型 · 59 工具 · 27 基准 · 36 数据库与数据集",
        detailEn: "Also indexes 11 scientific agents, 7 tutorials, 4 papers, and 3 standards.",
        detailZh: "同时收录 11 个科学代理、7 个教程集、4 篇基准论文与 3 项数据标准。",
        metricEn: "232 Audited Records",
        metricZh: "232 条核验记录",
        color: "#0b6e69",
      },
      {
        tag: "5B · ACCESS != LICENCE",
        titleEn: "Access Level Separated from Legal Reuse Terms",
        titleZh: "访问层级（公开/注册/受限）与法律许可证解耦",
        detailEn: "Public download does not imply commercial reuse; registration gates are flagged.",
        detailZh: "可免费下载不代表允许商业复用；注册门禁与非商业条款逐条标注。",
        metricEn: "Dated Verification",
        metricZh: "逐条标注核验日期",
        color: "#2b5c8f",
      },
      {
        tag: "5C · SIDE-BY-SIDE COMPARISON",
        titleEn: "Compare 2–4 Resources Across List, Table & Landscape",
        titleZh: "支持 2–4 项资源在列表、表格与全景视图下并排对比",
        detailEn: "Zero-backend static index (0.036 MB initial HTML) with full no-JS browsing.",
        detailZh: "纯静态零后端架构（首屏 HTML 仅 0.036 MB），无 JavaScript 亦可完整浏览。",
        metricEn: "2–4 Resource Diff",
        metricZh: "2–4 项资源并排对标",
        color: "#5b437a",
      },
    ],
    footerEn: "Every Atlas record cites primary repositories, publications, and verification timestamps.",
    footerZh: "每条图谱记录均绑定一手代码仓库、原始论文引文与精确到日的核验时间戳。",
  },
  // Chapter 06 (1:00-1:12)
  {
    headerEn: "CHAPTER 06 · 7-DIMENSION OPENNESS AUDIT",
    headerZh: "第 06 章 · 七维工程开放性解耦审计",
    figLabelEn: "FIGURE 08 · SEVEN OPENNESS DIMENSIONS ACROSS 232 RECORDS (P6)",
    figLabelZh: "图 08 · 232 条资源在七个工程开放性维度上的实证分布 (P6)",
    cards: [
      {
        tag: "6A · SEVEN SEPARATE QUESTIONS",
        titleEn: "Inference · Training · Weights · Arch · Recipe · Data · Eval",
        titleZh: "推理 · 训练 · 权重 · 架构 · 数据配方 · 训练数据 · 评测",
        detailEn: "Never collapse engineering reproducibility into a single binary 'open' badge.",
        detailZh: "拒绝笼统的“开源”标签，将复现所需的七项工程资产拆分为独立字段。",
        metricEn: "7×232 = 1,624 Cells",
        metricZh: "1,624 个开放性证据格",
        color: "#0b6e69",
      },
      {
        tag: "6B · MODEL REPRODUCIBILITY GAP",
        titleEn: "Inference Code (78/84) vs Data Recipe (29/84)",
        titleZh: "模型推理代码（78/84）与数据清洗配方（29/84）的显著落差",
        detailEn: "93% of audited models ship inference code, but only 35% publish data recipes.",
        detailZh: "93% 的模型公开推理代码，但仅 35% 公开完整数据清洗配方、25% 公开评测代码。",
        metricEn: "93% vs 35% Gap",
        metricZh: "93% 对 35% 复现鸿沟",
        color: "#8b4c24",
      },
      {
        tag: "6C · FOUR EVIDENCE STATES",
        titleEn: "Available · Not Available · Unverified · Not Applicable",
        titleZh: "可用 · 不可用 · 未核验 (Unverified) · 不适用 (N/A)",
        detailEn: "Excludes N/A denominators (e.g. weights for databases) to prevent distortion.",
        detailZh: "计算分母时自动剔除不适用项（如数据库的模型权重），避免统计失真。",
        metricEn: "4 Evidence States",
        metricZh: "4 态证据严格区分",
        color: "#2b5c8f",
      },
    ],
    footerEn: "Executable lab `labs/asset_openness_audit` verifies all 232 records on CPU.",
    footerZh: "配套可执行实验 `labs/asset_openness_audit` 支持在本地 CPU 上一键复核全部 232 条记录。",
  },
  // Chapter 07 (1:12-1:24)
  {
    headerEn: "CHAPTER 07 · 56 CPU LABS & FROZEN LIFECYCLE",
    headerZh: "第 07 章 · 56 个 CPU 实验与冻结评测周期",
    figLabelEn: "FIGURE 14 · FIVE-STAGE FROZEN EVALUATION LIFECYCLE (S7)",
    figLabelZh: "图 14 · 五阶段冻结评测生命周期与测试边界隔离 (S7)",
    cards: [
      {
        tag: "7A · FROZEN PROTOCOL LIFECYCLE",
        titleEn: "Protocol Lock → Split Audit → Dev → One-Shot Test",
        titleZh: "协议锁定 → 划分审计 → 开发选择 → 单次锁定测试",
        detailEn: "Hard TEST BOUNDARY prevents test-set peeking or post-hoc hyperparameter retuning.",
        detailZh: "硬性测试边界（TEST BOUNDARY）严禁测试集偷看与事后超参数重调。",
        metricEn: "5 Lifecycle Stages",
        metricZh: "5 阶段防泄漏闭环",
        color: "#0b6e69",
      },
      {
        tag: "7B · SPLIT CALIBRATION (FREESOLV)",
        titleEn: "Scaffold vs Random Split Error & Calibration Drift",
        titleZh: "FreeSolv (n=642) 骨架划分与随机划分校准漂移",
        detailEn: "Random splits overstate accuracy and understate uncertainty on unseen scaffolds.",
        detailZh: "随机划分显著高估新母核泛化性能并低估预测不确定性。",
        metricEn: "FreeSolv n = 642",
        metricZh: "FreeSolv n = 642 实测",
        color: "#2b5c8f",
      },
      {
        tag: "7C · THREE EXECUTION MODES",
        titleEn: "Read Retained · Fresh Reproduction · Student Exercise",
        titleZh: "阅读保留结果 · 独立复现 · 学生隔离目录练习",
        detailEn: "Student runs write to an isolated folder and never overwrite locked baselines.",
        detailZh: "学生练习输出至独立目录，绝不覆盖仓库中已锁定的基准结果。",
        metricEn: "56 Lab Guides",
        metricZh: "56 份双语实验指南",
        color: "#5b437a",
      },
    ],
    footerEn: "Four paired EN/ZH Jupyter notebooks share 100% identical code cells enforced by CI.",
    footerZh: "4 组中英双语可编辑 Notebook 保持 100% 相同代码单元格，由 CI 自动校验同步。",
  },
  // Chapter 08 (1:24-1:36)
  {
    headerEn: "CHAPTER 08 · RETAINED ADVERSE EVIDENCE & FLIPS",
    headerZh: "第 08 章 · 保留反面证据与跨测定排名反转",
    figLabelEn: "FIGURE 16 · CHEMBL 37 EGFR ASSAY-TRANSFER RANK FLIP (P9)",
    figLabelZh: "图 16 · ChEMBL 37 EGFR 主划分与独立测定排名反转 (P9)",
    cards: [
      {
        tag: "8A · PRIMARY PARTITION (n=132)",
        titleEn: "Morgan Ridge Wins Primary Split (MAE 0.418, ρ=0.505)",
        titleZh: "主划分 (n=132)：Morgan Ridge 排名第一 (MAE 0.418)",
        detailEn: "On the primary chiral scaffold split, Morgan Ridge beats Descriptor Ridge (0.469).",
        detailZh: "在主划分手性骨架测试集上，Morgan 指纹优于理化描述符基线（0.469）。",
        metricEn: "#1 · MAE 0.418",
        metricZh: "主划分 #1 (0.418)",
        color: "#0b6e69",
      },
      {
        tag: "8B · ASSAY REPLICATION (n=170)",
        titleEn: "Ranking Inverts on Separate Assay (MAE 3.132, ρ=-0.041)",
        titleZh: "独立测定复现 (n=170)：Morgan Ridge 跌至末位 (MAE 3.132)",
        detailEn: "Spearman correlation flips sign (-0.041); Descriptor Ridge holds #1 (MAE 0.579).",
        detailZh: "秩相关变为负值（-0.041），理化描述符基线反超升至第一（MAE 0.579）。",
        metricEn: "Rank Flip #1 → #3",
        metricZh: "排名反转 #1 → #3",
        color: "#8b4c24",
      },
      {
        tag: "8C · MULTI-ASSAY & 3D POCKET REALITY",
        titleEn: "CYP2D6/3A4 Disagreement & PDB 1M17 3D Coordinates",
        titleZh: "CYP 跨测定分歧与 PDB 1M17 厄洛替尼 3D 口袋核验",
        detailEn: "Negative results, refusals, and assay shifts are preserved as core teaching cases.",
        detailZh: "跨测定不一致性、阴性结果与模型失效边界被完整保留为核心教学案例。",
        metricEn: "Adverse Evidence Kept",
        metricZh: "完整保留反面证据",
        color: "#2b5c8f",
      },
    ],
    footerEn: "A frozen benchmark establishes one comparison; it never guarantees cross-assay transfer.",
    footerZh: "核心教训：单次固定基准只能证明当前划分表现，绝不自动保证跨测定迁移有效。",
  },
  // Chapter 09 (1:36-1:48)
  {
    headerEn: "CHAPTER 09 · rMD17 PHYSICS & ACTIVE LEARNING",
    headerZh: "第 09 章 · rMD17 动力学统计与主动学习预算",
    figLabelEn: "FIGURE 19 · POOL-BUDGET ACQUISITION RECOVERY CURVES (P10)",
    figLabelZh: "图 19 · 主动学习采集策略恢复曲线与随机种子对照 (P10)",
    cards: [
      {
        tag: "9A · TRACK 11 (rMD17 DYNAMICS)",
        titleEn: "Correlated MD Frames & Block-Averaged Error Bars",
        titleZh: "rMD17 分子动力学时间自相关与分块误差棒校正",
        detailEn: "Naive i.i.d. frame errors underestimate uncertainty on benzene, uracil & ethanol.",
        detailZh: "直接按独立同分布计算帧误差会严重低估苯、尿嘧啶与乙醇构象的不确定性。",
        metricEn: "rMD17 Trajectory Audit",
        metricZh: "rMD17 轨迹统计核验",
        color: "#0b6e69",
      },
      {
        tag: "9B · TRACK 15 (ACTIVE LEARNING)",
        titleEn: "Ensemble Variance vs Maxmin Diversity vs 5 Random Seeds",
        titleZh: "集成方差、最大最小多样性与 5 随机种子基线对标",
        detailEn: "Evaluates top-k hit recovery across budget rounds against explicit random baselines.",
        detailZh: "在多轮受限实验预算下定量比较不确定性采样、多样性采样与 5 条随机曲线。",
        metricEn: "5 Random Seeds Shown",
        metricZh: "完整展示 5 条随机曲线",
        color: "#2b5c8f",
      },
      {
        tag: "9C · PROVENANCE DISCLOSURE",
        titleEn: "Explicit Disclosure of Prior Shared Label Access",
        titleZh: "如实披露 T15 与 T05 共享标签的历史访问记录",
        detailEn: "T15 accessed shared EGFR labels before T05 locked eval; recorded transparently.",
        detailZh: "T15 曾在 T05 锁定评测前访问共享标签，平台如实披露而非冒充未接触确认集。",
        metricEn: "Zero Hidden Leakage",
        metricZh: "零隐瞒历史标签接触",
        color: "#5b437a",
      },
    ],
    footerEn: "All 20 report figures pair static PDF/PNG masters with interactive web data inspectors.",
    footerZh: "全部 20 张报告图件均同时提供出版级 PDF/PPTX 母版与网页端交互式数据检查器。",
  },
  // Chapter 10 (1:48-2:00)
  {
    headerEn: "CHAPTER 10 · 13-SYSTEM COVERAGE & RELEASE AUDIT",
    headerZh: "第 10 章 · 13 系统覆盖审计与全栈可复现交付",
    figLabelEn: "FIGURE 11 · 13-SYSTEM × 93-TOPIC COVERAGE BOUNDS AUDIT (P2)",
    figLabelZh: "图 11 · 13 个公开系统 × 93 个主题的覆盖率上下界审计 (P2)",
    cards: [
      {
        tag: "10A · 13 SYSTEMS × 93 TOPICS",
        titleEn: "1,209 Audited Cells With Lower/Upper Evidence Bounds",
        titleZh: "13 个系统 × 93 个主题（1,209 审计格）上下界区间",
        detailEn: "Compares curricula, benchmark hubs, tutorial collections, and specialist references.",
        detailZh: "横跨课程体系、基准平台、教程集合与专业手册四类提供方，拒绝黑盒排行榜。",
        metricEn: "1,209 Audited Cells",
        metricZh: "1,209 个一手证据格",
        color: "#0b6e69",
      },
      {
        tag: "10B · BLIND SANDBOX ISOLATION",
        titleEn: "93/93 Direct Real-Data Observations (Problems = 0)",
        titleZh: "盲审沙箱复核：93/93 真实数据实测（违规数 = 0）",
        detailEn: "Every topic command verified inside an isolated sandbox without network peeking.",
        detailZh: "全部 93 个主题命令均在隔离沙箱内完成实测核验，实现全维度 93/93 覆盖。",
        metricEn: "93 / 93 Across 5 Tiers",
        metricZh: "五级深度全部 93/93",
        color: "#2b5c8f",
      },
      {
        tag: "10C · FULL-STACK VERIFICATION",
        titleEn: "1,267 Pytest · 922 Web Pages · 94-Page PDF · 0 Hygiene Leaks",
        titleZh: "1,267 项测试 · 922 页双语站点 · 94 页报告 · 零卫生泄漏",
        detailEn: "Open-source curriculum, catalogue, CPU labs, and living report ready for the community.",
        detailZh: "课程、图谱、CPU 实验与动态报告全栈开源可复现，随时支持独立复核与协作。",
        metricEn: "2,145 Release Files",
        metricZh: "2,145 个净室发布文件",
        color: "#5b437a",
      },
    ],
    footerEn: "AIDD Commons · Open Curriculum · Evidence Atlas · CPU-First Labs · Living Report",
    footerZh: "AIDD Commons · 开放课程 · 证据图谱 · CPU 优先实验 · 动态技术报告",
  },
];

const renderStageCenter = (
  locale: OverviewLocale,
  stageIndex: number,
  stageProgress: number,
): string => {
  const zh = locale === "zh-cn";
  const spec = CHAPTER_SPECS[stageIndex]!;
  const figUri = figureUris[stageIndex]!;
  const activeSubphase = Math.min(2, Math.floor(stageProgress * 3));
  const subphaseProgress = (stageProgress * 3) % 1;

  return `
    <!-- Left Column: 3 Animated Sub-Phase Evidence Cards -->
    <rect x="40" y="146" width="600" height="402" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
    <text x="60" y="172" fill="#0b6e69" font-size="11.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(
      zh ? spec.headerZh : spec.headerEn,
    )}</text>

    <!-- Sub-phase pill indicator in top-right of left box -->
    <g transform="translate(454, 156)">
      ${[0, 1, 2]
        .map((sp) => {
          const isCur = sp === activeSubphase;
          const isPast = sp < activeSubphase;
          const bx = sp * 56;
          return `
            <rect x="${bx}" y="0" width="50" height="20" rx="10" fill="${
              isCur ? "#0b6e69" : isPast ? "#d6efec" : "#eee8dc"
            }"/>
            <text x="${bx + 25}" y="14" text-anchor="middle" fill="${
              isCur ? "#ffffff" : "#171614"
            }" font-size="10.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${
              stageIndex + 1
            }${["A", "B", "C"][sp]}</text>
          `;
        })
        .join("")}
    </g>

    ${spec.cards
      .map((card, idx) => {
        const y = 186 + idx * 104;
        const isActive = idx === activeSubphase;
        const isDone = idx < activeSubphase;
        const borderW = isActive ? "2.6" : "1.3";
        const bgFill = isActive ? "#f4fbfa" : isDone ? "#faf9f5" : "#ffffff";
        const barW = isActive
          ? Math.round(556 * Math.min(1, 0.25 + subphaseProgress * 0.85))
          : isDone
            ? 556
            : 0;
        return `
        <g>
          <rect x="60" y="${y}" width="560" height="92" rx="9" fill="${bgFill}" stroke="${card.color}" stroke-width="${borderW}"/>
          <rect x="60" y="${y}" width="8" height="92" rx="4" fill="${card.color}" opacity="${isActive ? "1" : "0.55"}"/>
          <text x="80" y="${y + 22}" fill="${card.color}" font-size="11" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(card.tag)}</text>
          <rect x="424" y="${y + 8}" width="182" height="22" rx="11" fill="${
            isActive ? card.color : "#eef4f3"
          }"/>
          <text x="515" y="${y + 23}" text-anchor="middle" fill="${
            isActive ? "#ffffff" : card.color
          }" font-size="11" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(
            zh ? card.metricZh : card.metricEn,
          )}</text>
          <text x="80" y="${y + 48}" fill="#171614" font-size="15.5" font-weight="700">${esc(
            zh ? card.titleZh : card.titleEn,
          )}</text>
          <text x="80" y="${y + 71}" fill="#4d4943" font-size="12.5" font-weight="500">${esc(
            zh ? card.detailZh : card.detailEn,
          )}</text>
          ${
            barW > 0
              ? `<rect x="62" y="${y + 87}" width="${barW}" height="3" rx="1.5" fill="${card.color}"/>`
              : ""
          }
        </g>`;
      })
      .join("")}

    <rect x="60" y="502" width="560" height="32" rx="6" fill="#eef7f6"/>
    <text x="74" y="523" fill="#0b6e69" font-size="12" font-weight="700">${esc(
      zh ? spec.footerZh : spec.footerEn,
    )}</text>

    <!-- Right Column: Publication Figure Preview & Sub-Phase Callout -->
    <rect x="656" y="146" width="584" height="402" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
    <text x="676" y="172" fill="#2b5c8f" font-size="11.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(
      zh ? spec.figLabelZh : spec.figLabelEn,
    )}</text>
    <rect x="672" y="182" width="552" height="312" rx="8" fill="#fbfaf7" stroke="#e5dfd3" stroke-width="1"/>
    <image href="${figUri}" x="678" y="186" width="540" height="304" preserveAspectRatio="xMidYMid meet"/>
    <rect x="672" y="502" width="552" height="32" rx="6" fill="#eff5fb"/>
    <text x="686" y="523" fill="#2b5c8f" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(
      zh
        ? OVERVIEW_STAGES[stageIndex]!.subphasesZh[activeSubphase]!
        : OVERVIEW_STAGES[stageIndex]!.subphasesEn[activeSubphase]!,
    )}</text>
  `;
};

const renderFrameSvg = (
  locale: OverviewLocale,
  frameIndex: number,
): string => {
  const zh = locale === "zh-cn";
  const framesPerStage = STAGE_SECONDS * RENDER_FPS;
  const stageIndex = Math.min(
    OVERVIEW_STAGES.length - 1,
    Math.floor(frameIndex / framesPerStage),
  );
  const stageFrame = frameIndex - stageIndex * framesPerStage;
  const stageProgress = stageFrame / Math.max(1, framesPerStage - 1);
  const stage = OVERVIEW_STAGES[stageIndex]!;
  const elapsedSeconds = (frameIndex + 1) / RENDER_FPS;
  const activeSubphase = Math.min(2, Math.floor(stageProgress * 3));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f7f4ec"/>

  <!-- Top Header Banner -->
  <rect x="0" y="0" width="${WIDTH}" height="58" fill="#162121"/>
  <rect x="24" y="12" width="148" height="34" rx="6" fill="#0b6e69"/>
  <text x="98" y="34" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">AIDD COMMONS</text>
  <text x="188" y="35" fill="#f7f4ec" font-size="15.5" font-weight="700" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${esc(
    zh
      ? "AI 药物发现开放学习与实证研究系统 · 2 分钟全景深度导览"
      : "Open Learning & Empirical Benchmark System for AI Drug Discovery · 2-Minute Tour",
  )}</text>
  <text x="1252" y="35" text-anchor="end" fill="#9ed8d3" font-size="12.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(
    zh
      ? `章节 ${stage.code}/10 · 子阶段 ${stageIndex + 1}${["A", "B", "C"][activeSubphase]} · ${formatTime(elapsedSeconds)} / 2:00`
      : `CHAPTER ${stage.code}/10 · PHASE ${stageIndex + 1}${["A", "B", "C"][activeSubphase]} · ${formatTime(elapsedSeconds)} / 2:00`,
  )}</text>

  <!-- 10-Chapter Stepper Bar (single row of 10 compact pills) -->
  <g transform="translate(40, 70)">
    ${OVERVIEW_STAGES.map((item, idx) => {
      const boxW = 114;
      const gap = 6.6;
      const x = Math.round(idx * (boxW + gap));
      const isCurrent = idx === stageIndex;
      const isDone = idx < stageIndex;
      const fill = isCurrent ? "#0b6e69" : isDone ? "#dcefeb" : "#ebe5d8";
      const stroke = isCurrent ? "#0b6e69" : isDone ? "#0b6e69" : "#cfc7b8";
      const textFill = isCurrent ? "#ffffff" : "#171614";
      const label = zh ? item.shortZh : item.shortEn;
      return `
        <g>
          <rect x="${x}" y="0" width="${boxW}" height="58" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${isCurrent ? "2" : "1.2"}"/>
          <text x="${x + 10}" y="23" fill="${isCurrent ? "#c8f2ed" : "#0b6e69"}" font-size="10.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(
            `${formatTime(item.startSeconds)}–${formatTime(item.endSeconds)}`,
          )}</text>
          <text x="${x + 9}" y="44" fill="${textFill}" font-size="10.8" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(label)}</text>
        </g>`;
    }).join("")}
  </g>

  <!-- Center Stage Canvas -->
  ${renderStageCenter(locale, stageIndex, stageProgress)}

  <!-- Bottom Narrative & Timeline Bar -->
  <rect x="40" y="562" width="1200" height="166" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
  <rect x="40" y="562" width="10" height="166" rx="4" fill="#0b6e69"/>
  <text x="68" y="592" fill="#0b6e69" font-size="12.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(
    zh ? stage.badgeZh : stage.badgeEn,
  )}</text>
  <text x="68" y="624" fill="#171614" font-size="20.5" font-weight="700" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${esc(
    zh ? stage.titleZh : stage.titleEn,
  )}</text>
  <text x="68" y="656" fill="#4d4943" font-size="14" font-weight="500" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${esc(
    zh ? stage.summaryZh : stage.summaryEn,
  )}</text>

  <!-- 10-Chapter Segmented Timeline Progress Bar -->
  <g transform="translate(68, 684)">
    ${OVERVIEW_STAGES.map((_, idx) => {
      const segW = 98;
      const segGap = 4;
      const sx = idx * (segW + segGap);
      let fillW = 0;
      if (idx < stageIndex) fillW = segW;
      else if (idx === stageIndex) fillW = Math.round(segW * stageProgress);
      return `
        <rect x="${sx}" y="0" width="${segW}" height="12" rx="4" fill="#ebe5d8"/>
        ${
          fillW > 0
            ? `<rect x="${sx}" y="0" width="${fillW}" height="12" rx="4" fill="#0b6e69"/>`
            : ""
        }
      `;
    }).join("")}
  </g>
  <text x="1104" y="695" fill="#0b6e69" font-size="13" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${formatTime(
    elapsedSeconds,
  )} / 2:00</text>
</svg>`;
};

const runFfmpeg = (args: string[]): void => {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: "inherit",
    cwd: repoRoot,
  });
};

const exportLocale = async (locale: OverviewLocale): Promise<void> => {
  const workDir = mkdtempSync(
    join(tmpdir(), `aidd-project-overview-${locale}-`),
  );
  try {
    // Render 480 frames in parallel batches of 24 for speed
    const batchSize = 24;
    for (let base = 0; base < TOTAL_FRAMES; base += batchSize) {
      const tasks: Array<Promise<unknown>> = [];
      for (
        let frame = base;
        frame < Math.min(TOTAL_FRAMES, base + batchSize);
        frame += 1
      ) {
        const svg = renderFrameSvg(locale, frame);
        const pngPath = join(
          workDir,
          `frame-${String(frame).padStart(4, "0")}.png`,
        );
        tasks.push(sharp(Buffer.from(svg)).png().toFile(pngPath));
      }
      await Promise.all(tasks);
    }

    const stem = join(outDir, `aidd-commons-overview-${locale}`);
    // Save poster from Chapter 01 Phase 1B representative frame
    const posterFramePath = join(workDir, "frame-0020.png");
    await sharp(posterFramePath)
      .webp({ quality: 90 })
      .toFile(`${stem}.webp`);

    // Save per-chapter crisp WebP stills (1..10)
    const framesPerStage = STAGE_SECONDS * RENDER_FPS;
    for (let s = 0; s < OVERVIEW_STAGES.length; s += 1) {
      const midFrame = s * framesPerStage + Math.floor(framesPerStage * 0.55);
      const midPath = join(
        workDir,
        `frame-${String(midFrame).padStart(4, "0")}.png`,
      );
      await sharp(midPath)
        .webp({ quality: 90 })
        .toFile(`${stem}-stage-${s + 1}.webp`);
    }

    const inputPattern = join(workDir, "frame-%04d.png");
    runFfmpeg([
      "-framerate",
      String(RENDER_FPS),
      "-i",
      inputPattern,
      "-vf",
      `fps=${OUTPUT_FPS}`,
      "-c:v",
      "libx264",
      "-tune",
      "stillimage",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-crf",
      "22",
      `${stem}.mp4`,
    ]);
    runFfmpeg([
      "-framerate",
      String(RENDER_FPS),
      "-i",
      inputPattern,
      "-vf",
      `fps=${OUTPUT_FPS}`,
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "0",
      "-crf",
      "32",
      "-pix_fmt",
      "yuv420p",
      `${stem}.webm`,
    ]);
    // 2-minute animated GIF (1 fps across all 120 seconds, 960px wide) for GitHub README
    runFfmpeg([
      "-framerate",
      String(RENDER_FPS),
      "-i",
      inputPattern,
      "-vf",
      "fps=1,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4",
      "-loop",
      "0",
      `${stem}.gif`,
    ]);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
};

mkdirSync(outDir, { recursive: true });
for (const locale of ["en", "zh-cn"] as const) {
  await exportLocale(locale);
  console.log(
    `exported 2-minute (120s) project overview media: aidd-commons-overview-${locale}`,
  );
}
