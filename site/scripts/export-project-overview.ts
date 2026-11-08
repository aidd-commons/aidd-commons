import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  OVERVIEW_STAGES,
  type OverviewLocale,
} from "../src/lib/project-overview-media";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const outDir = resolve(scriptDir, "../public/media/overview");
const figuresDir = resolve(scriptDir, "../public/figures");

const WIDTH = 1280;
const HEIGHT = 760;
const FPS = 12;
const STAGE_SECONDS = 3;
const TOTAL_SECONDS = OVERVIEW_STAGES.length * STAGE_SECONDS;
const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

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

const fig01DataUri = await loadFigureBase64("schematic-01-artifacts.png");
const fig08DataUri = await loadFigureBase64("plot-6-openness-matrix.png");
const fig11DataUri = await loadFigureBase64("plot-2-coverage-bounds.png");
const fig16DataUri = await loadFigureBase64("plot-9-representation-ranking-flips.png");

const renderStageCenter = (
  locale: OverviewLocale,
  stageIndex: number,
  stageProgress: number,
): string => {
  const zh = locale === "zh-cn";
  const pulse = 0.5 + 0.5 * Math.sin(stageProgress * Math.PI * 4);
  const barGrow = Math.min(1, stageProgress * 1.45);

  if (stageIndex === 0) {
    // Stage 01: Four Coupled Artefacts + Figure 01 preview
    const cards = [
      {
        code: "01 · LEARN",
        title: zh ? "18 条课程轨道" : "18 Curriculum Tracks",
        metric: zh ? "93 / 93 真实数据核验" : "93 / 93 Real-Data Assessed",
        sub: zh ? "111 篇中英双语章节" : "111 bilingual chapters",
        color: "#0b6e69",
        bg: "#eef7f6",
        x: 56,
        y: 184,
      },
      {
        code: "02 · ATLAS",
        title: zh ? "232 条证据资源记录" : "232 Evidence Atlas Records",
        metric: zh ? "7 维技术开放性审计" : "7 Openness Dimensions",
        sub: zh ? "许可与工程资产分离记录" : "Licence decoupled from assets",
        color: "#2b5c8f",
        bg: "#eff5fb",
        x: 346,
        y: 184,
      },
      {
        code: "03 · LABS",
        title: zh ? "56 个 CPU 优先实验" : "56 CPU-First Executable Labs",
        metric: zh ? "871 项自动化回归测试" : "871 Automated Pytest Gates",
        sub: zh ? "冻结协议 + 保留阴性结果" : "Frozen protocols + negative results",
        color: "#8b4c24",
        bg: "#fbf4ee",
        x: 56,
        y: 360,
      },
      {
        code: "04 · REPORT",
        title: zh ? "94 页动态技术报告" : "94-Page Living Report",
        metric: zh ? "13 系统 × 93 主题审计" : "13-System × 93-Topic Audit",
        sub: zh ? "20 张出版级科学图件" : "20 publication-grade figures",
        color: "#5b437a",
        bg: "#f5f1fa",
        x: 346,
        y: 360,
      },
    ];

    const packetX = 346 + 155 * Math.cos(stageProgress * Math.PI * 2);
    const packetY = 346 + 86 * Math.sin(stageProgress * Math.PI * 2);

    return `
      <!-- Left: 4 Coupled Artefact Loop Cards -->
      <rect x="40" y="148" width="612" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
      <text x="58" y="172" fill="#0b6e69" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "四层双向耦合证据闭环 · FOUR-ARTEFACT EVIDENCE LOOP" : "FOUR-ARTEFACT COUPLED EVIDENCE LOOP")}</text>

      <!-- Connecting loop tracks -->
      <path d="M 326 258 L 366 258 M 190 334 L 190 364 M 480 334 L 480 364 M 326 434 L 366 434" stroke="#0b6e69" stroke-width="3" stroke-dasharray="5 4"/>
      <ellipse cx="346" cy="346" rx="155" ry="86" fill="none" stroke="#0b6e69" stroke-opacity="0.26" stroke-width="2" stroke-dasharray="6 4"/>

      ${cards
        .map(
          (c, idx) => `
        <g>
          <rect x="${c.x}" y="${c.y}" width="272" height="150" rx="10" fill="${c.bg}" stroke="${c.color}" stroke-width="${idx === Math.floor(stageProgress * 4) % 4 ? "2.6" : "1.5"}"/>
          <rect x="${c.x}" y="${c.y}" width="272" height="6" rx="3" fill="${c.color}"/>
          <text x="${c.x + 16}" y="${c.y + 26}" fill="${c.color}" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(c.code)}</text>
          <text x="${c.x + 16}" y="${c.y + 52}" fill="#171614" font-size="17.5" font-weight="700">${esc(c.title)}</text>
          <rect x="${c.x + 16}" y="${c.y + 68}" width="240" height="32" rx="6" fill="#ffffff" stroke="${c.color}" stroke-opacity="0.35"/>
          <text x="${c.x + 26}" y="${c.y + 89}" fill="${c.color}" font-size="13.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(c.metric)}</text>
          <text x="${c.x + 16}" y="${c.y + 126}" fill="#4d4943" font-size="12.5" font-weight="600">${esc(c.sub)}</text>
        </g>`,
        )
        .join("")}
      <circle cx="${packetX.toFixed(1)}" cy="${packetY.toFixed(1)}" r="7" fill="#0b6e69" stroke="#ffffff" stroke-width="2"/>

      <!-- Right: Figure 01 Master Schematic Preview -->
      <rect x="672" y="148" width="568" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
      <text x="692" y="172" fill="#2b5c8f" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "图 01 · 系统架构主图 (S1)" : "FIGURE 01 · ARCHITECTURAL SCHEMATIC (S1)")}</text>
      <image href="${fig01DataUri}" x="686" y="184" width="540" height="314" preserveAspectRatio="xMidYMid meet"/>
      <rect x="688" y="504" width="536" height="30" rx="6" fill="#eef7f6"/>
      <text x="702" y="524" fill="#0b6e69" font-size="12.5" font-weight="700">${esc(zh ? "核心准则：任何课程断言必须可追溯至图谱记录、可运行脚本与报告证据表。" : "Contract: Every lesson claim traces to an Atlas record, executable lab, and report table.")}</text>
    `;
  }

  if (stageIndex === 1) {
    // Stage 02: 18-Track Curriculum (93/93 Real-Data Assessed)
    const pillars = [
      {
        tag: "T01 – T04",
        title: zh ? "药物发现与数据治理基石" : "Discovery & Data Governance",
        tracks: zh
          ? "靶点测定 · 分子实体 · 泄漏审计 · 证据规范"
          : "Assay framing · Chemical identity · Split leakage · Evidence",
        units: "22 / 22",
        color: "#0b6e69",
      },
      {
        tag: "T05 – T10",
        title: zh ? "分子表示、QSAR 与多端点建模" : "Representations, QSAR & ADMET",
        tracks: zh
          ? "指纹与图网络 · 3D 构象 · 校准与不确定性 · ADMET"
          : "FP & GNNs · 3D conformers · Calibration · Multi-endpoint ADMET",
        units: "31 / 31",
        color: "#2b5c8f",
      },
      {
        tag: "T11 – T14",
        title: zh ? "生物大分子结构、物理与生成模型" : "Structure, Physics & Generation",
        tracks: zh
          ? "共折叠 (Boltz/AF3) · rMD17 动力学 · 口袋条件生成"
          : "Co-folding (Boltz/AF3) · rMD17 dynamics · Pocket generation",
        units: "20 / 20",
        color: "#5b437a",
      },
      {
        tag: "T15 – T18",
        title: zh ? "主动学习、文献代理与候选提名" : "Active Learning, Agents & Nomination",
        tracks: zh
          ? "预算获取 (T15) · 本地检索代理 · 合成路线 · 候选提名"
          : "Pool budgets (T15) · Local RAG · Retrosynthesis · Nomination",
        units: "20 / 20",
        color: "#8b4c24",
      },
    ];

    return `
      <!-- Left: 18 Tracks Grouped into 4 Dependency Pillars -->
      <rect x="40" y="148" width="660" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
      <text x="62" y="176" fill="#0b6e69" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "18 条前置依赖轨道 · 93/93 真实数据核验主题 (100%)" : "18 PREREQUISITE-LINKED TRACKS · 93/93 REAL-DATA ASSESSED (100%)")}</text>

      ${pillars
        .map((p, idx) => {
          const y = 194 + idx * 84;
          const active = idx <= Math.floor(stageProgress * 4);
          return `
          <g>
            <rect x="60" y="${y}" width="620" height="72" rx="9" fill="${active ? "#f8faf9" : "#ffffff"}" stroke="${p.color}" stroke-width="${active ? "2.2" : "1.2"}"/>
            <rect x="60" y="${y}" width="106" height="72" rx="9" fill="${p.color}"/>
            <text x="113" y="${y + 32}" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(p.tag)}</text>
            <text x="113" y="${y + 53}" text-anchor="middle" fill="#e2f3f1" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(p.units)}</text>
            <text x="182" y="${y + 29}" fill="#171614" font-size="16" font-weight="700">${esc(p.title)}</text>
            <text x="182" y="${y + 52}" fill="#4d4943" font-size="13" font-weight="500">${esc(p.tracks)}</text>
            <rect x="554" y="${y + 20}" width="110" height="30" rx="15" fill="#eef7f6" stroke="${p.color}" stroke-width="1.2"/>
            <text x="609" y="${y + 40}" text-anchor="middle" fill="${p.color}" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "100% 实测" : "100% Assessed")}</text>
          </g>`;
        })
        .join("")}

      <!-- Right: Anatomy of a Teaching Unit -->
      <rect x="720" y="148" width="520" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
      <text x="742" y="176" fill="#2b5c8f" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "标准教学单元结构 · LESSON TEACHING CONTRACT" : "ANATOMY OF AN ASSESSED TEACHING UNIT")}</text>

      ${[
        {
          step: "1",
          title: zh ? "科学问题与生物/化学实体边界" : "1. Biological & Chemical Object Framing",
          desc: zh ? "明确测定协议、配体母核、靶点构象与决策单位" : "Define assay protocol, parent salt form, pocket state & decision unit",
          color: "#0b6e69",
        },
        {
          step: "2",
          title: zh ? "交互式机制图与多源图谱锚点" : "2. Interactive Mechanism & Atlas Anchors",
          desc: zh ? "内嵌可步进科学故事动画、公式推导与开放性卡片" : "Step-by-step animated mechanism story, math & resource cards",
          color: "#2b5c8f",
        },
        {
          step: "3",
          title: zh ? "CPU 可执行真实数据基线核验" : "3. CPU-First Real-Data Lab Verification",
          desc: zh ? "固定划分 + 一键复现实验脚本 + 学生独立输出目录" : "Locked split + deterministic CLI/notebook + isolated student output",
          color: "#5b437a",
        },
        {
          step: "4",
          title: zh ? "失败模式、阴性结果与适用边界" : "4. Failure Modes & Explicit Scope Limits",
          desc: zh ? "保留跨测定排名反转、泄漏陷阱与不适用场景" : "Retained ranking flips, leakage traps & non-transferable bounds",
          color: "#8b4c24",
        },
      ]
        .map((item, i) => {
          const y = 196 + i * 82;
          return `
          <g>
            <rect x="742" y="${y}" width="476" height="68" rx="8" fill="#fbfaf7" stroke="${item.color}" stroke-width="1.4"/>
            <circle cx="772" cy="${y + 34}" r="16" fill="${item.color}"/>
            <text x="772" y="${y + 39}" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${item.step}</text>
            <text x="800" y="${y + 28}" fill="#171614" font-size="15" font-weight="700">${esc(item.title)}</text>
            <text x="800" y="${y + 50}" fill="#4d4943" font-size="12.5" font-weight="500">${esc(item.desc)}</text>
          </g>`;
        })
        .join("")}
    `;
  }

  if (stageIndex === 2) {
    // Stage 03: 232-Record Evidence Atlas & 7 Openness Dimensions (exact Figure 08 model n=84 counts)
    const dims = [
      { name: zh ? "推理代码" : "Inference Code", count: "78/84", pct: 93, color: "#0b6e69" },
      { name: zh ? "模型架构" : "Architecture", count: "58/84", pct: 69, color: "#0b6e69" },
      { name: zh ? "训练代码" : "Training Code", count: "51/84", pct: 61, color: "#2b5c8f" },
      { name: zh ? "模型权重" : "Model Weights", count: "50/84", pct: 60, color: "#2b5c8f" },
      { name: zh ? "训练数据" : "Training Data", count: "30/84", pct: 36, color: "#5b437a" },
      { name: zh ? "数据配方" : "Data Recipe", count: "29/84", pct: 35, color: "#8b4c24" },
      { name: zh ? "评测代码" : "Evaluation Code", count: "21/84", pct: 25, color: "#a23b2a" },
    ];

    return `
      <!-- Left: 7 Openness Dimensions Audit Breakdown -->
      <rect x="40" y="148" width="590" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
      <text x="62" y="176" fill="#0b6e69" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "232 条资源图谱 · 模型子集 (n=84) 七维开放性实证" : "232 ATLAS RECORDS · MODEL SUBSET (n=84) 7 OPENNESS FIELDS")}</text>
      <text x="62" y="200" fill="#4d4943" font-size="13" font-weight="600">${esc(zh ? "拒绝笼统“开源”标签：推理代码可用 (78/84) ≠ 数据配方可复现 (29/84)" : "Never collapse openness: inference code (78/84) != data recipe (29/84)")}</text>

      ${dims
        .map((d, i) => {
          const y = 222 + i * 42;
          const w = Math.round(290 * (d.pct / 100) * barGrow);
          return `
          <g>
            <text x="62" y="${y + 18}" fill="#171614" font-size="13.5" font-weight="700">${esc(d.name)}</text>
            <rect x="206" y="${y + 4}" width="290" height="20" rx="5" fill="#f1ece1" stroke="#d5cec2" stroke-width="1"/>
            <rect x="206" y="${y + 4}" width="${w}" height="20" rx="5" fill="${d.color}"/>
            <text x="508" y="${y + 19}" fill="${d.color}" font-size="12.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${d.count} (${d.pct}%)</text>
          </g>`;
        })
        .join("")}

      <rect x="62" y="514" width="546" height="22" rx="4" fill="#eef7f6"/>
      <text x="74" y="529" fill="#0b6e69" font-size="11.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "字段：lifecycle · access · license · 7×openness · last_verified" : "Schema: lifecycle · access · license · 7×openness · last_verified")}</text>

      <!-- Right: Figure 08 Openness Audit Preview -->
      <rect x="650" y="148" width="590" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
      <text x="672" y="176" fill="#2b5c8f" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "图 08 · 七维资产开放性实证分布 (P6)" : "FIGURE 08 · SEVEN-DIMENSION OPENNESS AUDIT (P6)")}</text>
      <image href="${fig08DataUri}" x="664" y="186" width="562" height="346" preserveAspectRatio="xMidYMid meet"/>
    `;
  }

  if (stageIndex === 3) {
    // Stage 04: 56 CPU-First Real-Data Labs & ChEMBL 37 EGFR Assay-Transfer Ranking Flip
    return `
      <!-- Left: ChEMBL 37 EGFR Ranking Inversion & Protocol Card -->
      <rect x="40" y="148" width="576" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
      <text x="62" y="176" fill="#8b4c24" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "真实案例 · 跨测定基线排名反转 (CHEMBL203 EGFR)" : "WORKED CASE · ASSAY-TRANSFER RANKING INVERSION (CHEMBL203)")}</text>
      <text x="62" y="202" fill="#171614" font-size="15.5" font-weight="700">${esc(zh ? "同一靶点 EGFR：主划分最优模型在独立测定上排名反转" : "Same EGFR target: top model on primary split flips on independent assay")}</text>

      <!-- Slope / Crossing Ranking Diagram -->
      <rect x="62" y="218" width="532" height="196" rx="10" fill="#fbfaf7" stroke="#d5cec2" stroke-width="1.2"/>
      <text x="195" y="242" text-anchor="middle" fill="#2b5c8f" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "T05 主划分 (n=132)" : "Primary Split (n=132)")}</text>
      <text x="455" y="242" text-anchor="middle" fill="#8b4c24" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "独立测定复现 (n=170)" : "Assay Replication (n=170)")}</text>

      <line x1="195" y1="254" x2="195" y2="394" stroke="#d5cec2" stroke-width="2"/>
      <line x1="455" y1="254" x2="455" y2="394" stroke="#d5cec2" stroke-width="2"/>

      <!-- Crossing lines -->
      <line x1="195" y1="282" x2="455" y2="366" stroke="#0b6e69" stroke-width="3.5"/>
      <line x1="195" y1="362" x2="455" y2="286" stroke="#8b4c24" stroke-width="3.5" stroke-dasharray="7 4"/>

      <circle cx="195" cy="282" r="6.5" fill="#0b6e69"/>
      <circle cx="455" cy="366" r="6.5" fill="#0b6e69"/>
      <text x="76" y="276" fill="#0b6e69" font-size="11.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">Morgan Ridge</text>
      <text x="76" y="293" fill="#0b6e69" font-size="11" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">#1 · MAE 0.418</text>
      <text x="468" y="362" fill="#0b6e69" font-size="11.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">Morgan Ridge</text>
      <text x="468" y="379" fill="#0b6e69" font-size="11" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">#3 · MAE 3.132</text>

      <circle cx="195" cy="362" r="6.5" fill="#8b4c24"/>
      <circle cx="455" cy="286" r="6.5" fill="#8b4c24"/>
      <text x="76" y="358" fill="#8b4c24" font-size="11.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">Descriptor</text>
      <text x="76" y="375" fill="#8b4c24" font-size="11" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">#2 · MAE 0.469</text>
      <text x="468" y="282" fill="#8b4c24" font-size="11.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">Descriptor</text>
      <text x="468" y="299" fill="#8b4c24" font-size="11" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">#1 · MAE 0.579</text>

      <rect x="277" y="310" width="96" height="26" rx="13" fill="#fff3cd" stroke="#8b4c24" stroke-width="1.5"/>
      <text x="325" y="327" text-anchor="middle" fill="#8b4c24" font-size="11.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "排名反转!" : "RANK FLIP!")}</text>

      <!-- 3 Execution Modes -->
      <rect x="62" y="428" width="532" height="102" rx="8" fill="#eef7f6" stroke="#0b6e69" stroke-width="1.2"/>
      <text x="78" y="450" fill="#0b6e69" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "三类明确隔离的执行模式 · THREE EXPLICIT LAB EXECUTION MODES" : "THREE EXPLICITLY SEPARATED LAB EXECUTION MODES")}</text>
      <text x="78" y="474" fill="#171614" font-size="12.5" font-weight="600">${esc(zh ? "① 阅读冻结结果 (Read Retained)   ② 独立完整复现 (Fresh Reproduction)" : "1. Read Retained Results   2. Fresh Independent Reproduction")}</text>
      <text x="78" y="498" fill="#171614" font-size="12.5" font-weight="600">${esc(zh ? "③ 学生可编辑练习 (Student Exercise → 独立目录，绝不覆盖锁定基线)" : "3. Editable Student Exercise -> isolated folder, never overwrites locked outputs")}</text>

      <!-- Right: Figure 16 Assay-Transfer & 3D 1M17 Pocket Preview -->
      <rect x="636" y="148" width="604" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
      <text x="658" y="176" fill="#2b5c8f" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "图 16 · EGFR 跨测定迁移与排名反转实证 (P9)" : "FIGURE 16 · EGFR ASSAY TRANSFER & RANK INVERSION (P9)")}</text>
      <image href="${fig16DataUri}" x="650" y="186" width="576" height="346" preserveAspectRatio="xMidYMid meet"/>
    `;
  }

  // Stage 05: 13-System Coverage Audit & Living Report
  return `
    <!-- Left: Figure 11 Coverage Audit Preview -->
    <rect x="40" y="148" width="660" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
    <text x="62" y="176" fill="#0b6e69" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "图 11 · 13 个公开系统 × 93 个课程主题覆盖率与证据上下界审计 (P2)" : "FIGURE 11 · 13-SYSTEM × 93-TOPIC COVERAGE & EVIDENCE BOUNDS AUDIT (P2)")}</text>
    <image href="${fig11DataUri}" x="54" y="186" width="632" height="346" preserveAspectRatio="xMidYMid meet"/>

    <!-- Right: Verification Summary & Call to Action -->
    <rect x="720" y="148" width="520" height="398" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
    <text x="742" y="176" fill="#5b437a" font-size="12" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(zh ? "全栈可复现验证 · FULL-STACK VERIFICATION GATES" : "END-TO-END REPRODUCIBLE VERIFICATION GATES")}</text>

    ${[
      {
        metric: "93 / 93",
        label: zh ? "课程主题完成真实数据实测 (100%)" : "Curriculum topics real-data assessed (100%)",
        color: "#0b6e69",
      },
      {
        metric: "871",
        label: zh ? "Python 实验与统计契约自动化测试通过" : "Python lab & statistical contract tests passing",
        color: "#2b5c8f",
      },
      {
        metric: "362",
        label: zh ? "中英双语静态网页路由 + 94 页 v0.2 报告 PDF" : "Bilingual static web pages + 94-page v0.2 report PDF",
        color: "#5b437a",
      },
      {
        metric: "0",
        label: zh ? "断链 · 引文漂移 · 双语数值偏差 · 卫生扫描违规" : "Broken links, citation drift, or release hygiene leaks",
        color: "#8b4c24",
      },
    ]
      .map((row, idx) => {
        const y = 196 + idx * 66;
        return `
        <g>
          <rect x="742" y="${y}" width="476" height="54" rx="8" fill="#fbfaf7" stroke="${row.color}" stroke-width="1.4"/>
          <text x="760" y="${y + 34}" fill="${row.color}" font-size="21" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(row.metric)}</text>
          <text x="860" y="${y + 33}" fill="#171614" font-size="13" font-weight="700">${esc(row.label)}</text>
        </g>`;
      })
      .join("")}

    <rect x="742" y="468" width="476" height="60" rx="8" fill="#0b6e69" opacity="${(0.92 + 0.08 * pulse).toFixed(2)}"/>
    <text x="980" y="494" text-anchor="middle" fill="#ffffff" font-size="14.5" font-weight="700">${esc(zh ? "开源可复现 · 18 轨道 · 232 资源 · 56 实验 · 94 页报告" : "Open & Reproducible · 18 Tracks · 232 Records · 56 CPU Labs")}</text>
    <text x="980" y="516" text-anchor="middle" fill="#d9f2ef" font-size="12.5" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">Learn · Atlas · Labs · Living Report · 13-System Audit</text>
  `;
};

const STEPPER_PILLS_EN = [
  "01 · Four Artefacts",
  "02 · 18 Tracks (93/93)",
  "03 · 232-Record Atlas",
  "04 · 56 CPU Labs",
  "05 · 13-System Audit",
];

const STEPPER_PILLS_ZH = [
  "01 · 四层耦合架构",
  "02 · 18 轨道 (93/93)",
  "03 · 232 条资源图谱",
  "04 · 56 个 CPU 实验",
  "05 · 13 系统对标审计",
];

const renderFrameSvg = (
  locale: OverviewLocale,
  frameIndex: number,
): string => {
  const zh = locale === "zh-cn";
  const framesPerStage = STAGE_SECONDS * FPS;
  const stageIndex = Math.min(
    OVERVIEW_STAGES.length - 1,
    Math.floor(frameIndex / framesPerStage),
  );
  const stageFrame = frameIndex - stageIndex * framesPerStage;
  const stageProgress = stageFrame / Math.max(1, framesPerStage - 1);
  const stage = OVERVIEW_STAGES[stageIndex]!;
  const overallProgress = (frameIndex + 1) / TOTAL_FRAMES;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f7f4ec"/>

  <!-- Top Header Banner -->
  <rect x="0" y="0" width="${WIDTH}" height="62" fill="#162121"/>
  <rect x="24" y="14" width="148" height="34" rx="6" fill="#0b6e69"/>
  <text x="98" y="36" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">AIDD COMMONS</text>
  <text x="190" y="37" fill="#f7f4ec" font-size="16" font-weight="700" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${esc(
    zh
      ? "AI 药物发现开放学习与实证研究系统 · 15 秒全景导览"
      : "Open Learning & Empirical Benchmark System for AI Drug Discovery",
  )}</text>
  <text x="1252" y="37" text-anchor="end" fill="#9ed8d3" font-size="13" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(
    zh
      ? `阶段 ${stage.code}/05 · 18 轨道 · 93/93 实测 · 232 资源 · 56 实验`
      : `STAGE ${stage.code}/05 · 18 TRACKS · 93/93 ASSESSED · 232 RECORDS · 56 LABS`,
  )}</text>

  <!-- 5-Stage Stepper Bar -->
  <g transform="translate(40, 76)">
    ${OVERVIEW_STAGES.map((_, idx) => {
      const boxW = 232;
      const gap = 10;
      const x = idx * (boxW + gap);
      const isCurrent = idx === stageIndex;
      const isDone = idx < stageIndex;
      const fill = isCurrent ? "#0b6e69" : isDone ? "#dcefeb" : "#ebe5d8";
      const stroke = isCurrent ? "#0b6e69" : isDone ? "#0b6e69" : "#cfc7b8";
      const textFill = isCurrent ? "#ffffff" : "#171614";
      const label = (zh ? STEPPER_PILLS_ZH[idx] : STEPPER_PILLS_EN[idx]) ?? "";
      return `
        <g>
          <rect x="${x}" y="0" width="${boxW}" height="46" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${isCurrent ? "2" : "1.2"}"/>
          <text x="${x + 16}" y="28" fill="${textFill}" font-size="13" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(label)}</text>
        </g>`;
    }).join("")}
  </g>

  <!-- Center Stage Canvas -->
  ${renderStageCenter(locale, stageIndex, stageProgress)}

  <!-- Bottom Narrative & Progress Bar -->
  <rect x="40" y="562" width="1200" height="162" rx="12" fill="#ffffff" stroke="#d5cec2" stroke-width="1.5"/>
  <rect x="40" y="562" width="10" height="162" rx="4" fill="#0b6e69"/>
  <text x="68" y="594" fill="#0b6e69" font-size="13" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(
    zh ? stage.badgeZh : stage.badgeEn,
  )}</text>
  <text x="68" y="628" fill="#171614" font-size="22" font-weight="700" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${esc(
    zh ? stage.titleZh : stage.titleEn,
  )}</text>
  <text x="68" y="662" fill="#4d4943" font-size="15" font-weight="500" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${esc(
    zh ? stage.summaryZh : stage.summaryEn,
  )}</text>

  <!-- Timeline progress bar -->
  <rect x="68" y="688" width="1020" height="12" rx="6" fill="#ebe5d8"/>
  <rect x="68" y="688" width="${Math.round(1020 * overallProgress)}" height="12" rx="6" fill="#0b6e69"/>
  <text x="1108" y="699" fill="#0b6e69" font-size="13" font-weight="700" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${((frameIndex + 1) / FPS).toFixed(1)}s / ${TOTAL_SECONDS}.0s</text>
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
    for (let frame = 0; frame < TOTAL_FRAMES; frame += 1) {
      const svg = renderFrameSvg(locale, frame);
      const pngPath = join(
        workDir,
        `frame-${String(frame).padStart(4, "0")}.png`,
      );
      await sharp(Buffer.from(svg)).png().toFile(pngPath);
    }

    const stem = join(outDir, `aidd-commons-overview-${locale}`);
    // Save poster from Stage 01 representative frame (frame 18 = 1.5s)
    const posterFramePath = join(workDir, "frame-0018.png");
    await sharp(posterFramePath)
      .webp({ quality: 90 })
      .toFile(`${stem}.webp`);

    // Also save per-stage crisp WebP stills so the interactive walkthrough can jump/inspect in reduced-motion or no-JS
    for (let s = 0; s < OVERVIEW_STAGES.length; s += 1) {
      const midFrame = s * STAGE_SECONDS * FPS + Math.floor((STAGE_SECONDS * FPS) / 2);
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
      String(FPS),
      "-i",
      inputPattern,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-crf",
      "21",
      `${stem}.mp4`,
    ]);
    runFfmpeg([
      "-framerate",
      String(FPS),
      "-i",
      inputPattern,
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "0",
      "-crf",
      "31",
      "-pix_fmt",
      "yuv420p",
      `${stem}.webm`,
    ]);
    // High-clarity 960px-wide GIF for GitHub README and docs
    runFfmpeg([
      "-framerate",
      String(FPS),
      "-i",
      inputPattern,
      "-vf",
      "fps=8,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4",
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
  console.log(`exported project overview media: aidd-commons-overview-${locale}`);
}
