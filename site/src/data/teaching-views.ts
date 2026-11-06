/** Scientific reading views. Result quantities are imported from retained lab summaries
 * by the renderer. Authored arithmetic cases are explicitly separated from those results.
 * This projection links existing lessons; it does not define another curriculum order.
 */
export type Bilingual = { en: string; zh: string };
export type TeachingSource = { label: string; url: string; date: string };
export type TeachingView = {
  question: Bilingual;
  mechanism: Bilingual;
  worked: Bilingual;
  task: Bilingual;
  answer: Bilingual;
  limit: Bilingual;
  state: Bilingual;
  lesson: string;
  lab?: string;
  sources: TeachingSource[];
};
const b = (en: string, zh: string): Bilingual => ({ en, zh });
export const teachingViews: Record<string, TeachingView> = {
  foundations: {
    question: b(
      "Which evidence closes the next discovery decision?",
      "哪种证据能回答下一项发现决策？",
    ),
    mechanism: b(
      "A discovery route changes scientific objects: disease context, target hypothesis, molecule, measured endpoint and a candidate dossier. Each transition needs an explicit question; reading order does not establish a causal chain.",
      "发现路径不断改变科学对象：疾病情境、靶点假设、分子、测量终点和候选证据档案。每次转换都需要明确的问题；阅读顺序不建立因果链。",
    ),
    worked: b(
      "A model score can prioritize a molecule for an assay. A matched assay record can support that endpoint in its stated context. The score cannot fill a missing safety or exposure field in the eventual dossier.",
      "模型分数可将分子排入某项 assay 的优先队列。匹配的 assay 记录可以支持特定情境中的终点。分数不能填补最终档案中缺失的安全性或暴露证据。",
    ),
    task: b(
      "Follow one stage below. Write its input object, output, unresolved field and next observation before opening its lesson.",
      "沿下方任一阶段阅读，先写出输入对象、输出、未解决字段和下一项观察，再打开相应课程。",
    ),
    answer: b(
      "A useful answer names an entity and context, a quantity or hypothesis, a permitted action, and an observation that could change it. A resource link alone is not that observation.",
      "完整答案应指定实体与情境、一个量或假设、允许采取的行动，以及可能改变它的观察。资源链接本身不是这种观察。",
    ),
    limit: b(
      "The route is an orientation and navigation aid. It does not estimate learning time, predict reader progress or validate a candidate.",
      "本路径用于导览和导航，不估计学习时长、不预测学习进度，也不验证候选物。",
    ),
    state: b("Curriculum navigation", "课程导航"),
    lesson: "foundations/getting-started",
    sources: [
      {
        label: "Canonical curriculum and decision-unit lesson",
        url: "/learn/foundations/decision-unit/",
        date: "2026-09-09",
      },
    ],
  },
  "drug-discovery-foundations": {
    question: b(
      "What did the dose-response curve actually measure?",
      "浓度响应曲线实际测量了什么？",
    ),
    mechanism: b(
      "A molecule acts within a declared target and assay system; the detector then produces a signal. Controls define the direction and scale of normalization. A concentration-response curve describes that readout under those conditions.",
      "分子作用于指定靶点和 assay 系统，检测器随后产生信号。对照决定归一化方向和尺度。浓度响应曲线描述的是这些条件下的读出。",
    ),
    worked: b(
      "The existing constructed fit uses residual activity: Bottom = 2%, Top = 98%, IC50 = 0.40 µM and Hill = 1.2. At 0.40 µM the fitted midpoint is 50%; at 0.80 µM residual activity is about 31.1%.",
      "既有构造拟合以残余活性为纵轴：Bottom = 2%、Top = 98%、IC50 = 0.40 µM、Hill = 1.2。在 0.40 µM 时拟合中点为 50%；在 0.80 µM 时残余活性约为 31.1%。",
    ),
    task: b(
      "Switch the displayed response. At the same concentration, explain why inhibition rises while residual activity falls. Name an orthogonal observation that would address detector interference.",
      "切换显示的响应。在相同浓度下，解释为何抑制率上升而残余活性下降，并指出能检验检测器干扰的正交观察。",
    ),
    answer: b(
      "In this constructed symmetric scale, inhibition = 100 − residual activity. Changing the sign is a change of readout definition, not a new assay. An orthogonal assay retains the relevant biology while changing detection.",
      "在此对称构造尺度中，抑制率 = 100 − 残余活性。方向变化来自读出定义，而不是新 assay。正交 assay 保留相关生物学，同时改变检测方式。",
    ),
    limit: b(
      "Every curve point is calculated from an authored equation. No compound was measured. IC50 is not Kd, Ki, target engagement, efficacy or a stoichiometry estimate.",
      "所有曲线点均来自作者给定方程，没有测量任何化合物。IC50 不等于 Kd、Ki、靶点占有、疗效或化学计量估计。",
    ),
    state: b("Constructed arithmetic", "构造算例"),
    lesson: "drug-discovery-foundations/assay-controls-dose-response",
    lab: "assay-endpoint-controls",
    sources: [
      {
        label: "Assay controls and dose-response worked case",
        url: "/learn/drug-discovery-foundations/assay-controls-dose-response/#worked-case-normalize-before-interpreting",
        date: "2026-09-09",
      },
      {
        label: "Assay Guidance Manual",
        url: "https://www.ncbi.nlm.nih.gov/books/NBK91993/",
        date: "2026-09-09",
      },
    ],
  },
  "machine-learning": {
    question: b(
      "Which rows may change the fitted predictor?",
      "哪些行可以改变拟合后的预测器？",
    ),
    mechanism: b(
      "Training determines parameters. Validation selects among declared candidate mappings. Evaluation describes the selected mapping on its stated population. Fitted preprocessing is part of that mapping and sees training rows only.",
      "训练决定参数。验证从预先声明的候选映射中进行选择。评估描述被选映射在指定总体中的表现。拟合型预处理也是映射的一部分，只使用训练行。",
    ),
    worked: b(
      "Training pairs (0,1), (1,3), (2,5) give w = 2 and b = 1 at alpha 0; alpha 2 gives w = 1 and b = 2. At x = 3 both have absolute validation error 1 against target 6. Apply the declared tie rule without reading a test target.",
      "训练点 (0,1)、(1,3)、(2,5) 在 alpha 0 时得到 w = 2、b = 1，在 alpha 2 时得到 w = 1、b = 2。在 x = 3、验证目标为 6 时，两者绝对误差均为 1。应按已声明的平局规则选择，而不读取测试目标。",
    ),
    task: b(
      "Select a candidate line. Predict at x = 3, then explain why adding the validation pair to fit changes the original training-only protocol.",
      "切换候选直线，预测 x = 3 的值，并解释为何把验证点加入 fit 会改变原来的仅训练集拟合协议。",
    ),
    answer: b(
      "The two predictions are 7 and 5. Validation can select between the two mappings but cannot enter their original fitting objective. An unchanged numeric answer in a special case would not preserve the access rule.",
      "两条直线的预测分别为 7 和 5。验证数据可在两种映射之间选择，却不能进入它们原始的拟合目标。特殊情况下数值不变，也不能保持原来的信息访问规则。",
    ),
    limit: b(
      "This is a constructed one-feature Ridge derivation, not molecular data or evidence that one penalty is generally better. The student notebook provides a separate editable exercise.",
      "这是单特征 Ridge 的构造推导，不是分子数据，也不证明某种惩罚普遍更好。学生 notebook 另行提供可编辑练习。",
    ),
    state: b("Constructed fit", "构造拟合"),
    lesson: "machine-learning/baseline-training-validation",
    sources: [
      {
        label: "Baseline fitting and validation derivation",
        url: "/learn/machine-learning/baseline-training-validation/",
        date: "2026-09-09",
      },
      {
        label: "Editable student modelling notebook",
        url: "/learn/machine-learning/student-modelling-sandbox/",
        date: "2026-09-09",
      },
    ],
  },
  "data-governance": {
    question: b(
      "When do several records become one prediction target?",
      "何时多条记录才可成为一个预测目标？",
    ),
    mechanism: b(
      "A record, a parent molecule and a molecule–assay pair are different objects. Entity alignment, unit conversion, duplicate removal and aggregation each change a different part of the data contract. Preserve the reason for every exclusion.",
      "记录、parent 分子和分子–assay 对是不同对象。实体对齐、单位换算、去重和聚合分别改变数据契约的不同部分。每项排除都应保留理由。",
    ),
    worked: b(
      "The constructed r1 and r2 records share parent A in assay E. Their exact IC50 values of 100 and 1000 nM become pIC50 7 and 6, then a median of 6.5. r1-copy is an export duplicate, not a third experiment.",
      "构造记录 r1、r2 均属于 assay E 中的 parent A。精确 IC50 为 100、1000 nM，分别转为 pIC50 7、6，再取中位数 6.5。r1-copy 是导出重复，不是第三次实验。",
    ),
    task: b(
      "Compare a row split with a parent-grouped split below. Identify the shared identity crossing the row split. Explain why the 10 µM lower bound cannot become an exact regression target.",
      "比较下方的按行划分和按 parent 分组划分，指出按行划分中跨集合的相同身份。解释为何 10 µM 下界不能直接作为精确回归目标。",
    ),
    answer: b(
      "A's measurements must stay together under a parent-grouped task. A bound IC50 > 10 µM implies pIC50 < 5; replacing the inequality with equality changes the endpoint. This example's exact-value regression retains its exclusion reason.",
      "在按 parent 分组的任务中，A 的测量必须放在同一集合。IC50 > 10 µM 意味着 pIC50 < 5；把不等式改成等式改变了终点。该例的精确值回归保留排除原因。",
    ),
    limit: b(
      "These rows and the parent mapping are authored teaching inputs. Group disjointness is a membership check, not proof that groups are independent or representative.",
      "这些行及 parent 映射均为作者构造的教学输入。组间不重叠只是成员检查，不证明各组相互独立或具有代表性。",
    ),
    state: b("Constructed lineage", "构造谱系"),
    lesson: "data-governance/records-to-model-table",
    lab: "split-leakage-audit",
    sources: [
      {
        label: "Records-to-model-table worked case",
        url: "/learn/data-governance/records-to-model-table/",
        date: "2026-09-09",
      },
    ],
  },
  representations: {
    question: b(
      "What does each encoding retain about the same molecule?",
      "同一分子的每种编码保留了什么？",
    ),
    mechanism: b(
      "SMILES serializes a graph. A 2D depiction lays out that graph. Descriptors summarize defined structural functions. A Morgan bit vector hashes local neighborhoods; its occupied bits are not atom contributions or measured properties.",
      "SMILES 将图序列化；二维图对该图进行布局；描述符汇总定义明确的结构函数。Morgan 位向量对局部邻域进行哈希，其占用位不是原子贡献或测得性质。",
    ),
    worked: b(
      "Inspect pyridine and the two defined alanine enantiomers. The alanines share a non-isomeric connectivity representation but retain different isomeric SMILES. Radius 2, 2048 bits and chirality enabled are fixed for this label-free projection.",
      "检查 pyridine 与两种已定义的 alanine 对映体。两个 alanine 共享非异构连接表示，但保留不同的 isomeric SMILES。本无标签投影固定采用 radius 2、2048 bits，并开启 chirality。",
    ),
    task: b(
      "Select the opposite alanine enantiomer. Which fields must change and which cannot establish a bioactive conformation? Then open the notebook and add a valid example in a fresh output folder.",
      "选择另一种 alanine 对映体。哪些字段应改变，哪些字段不能建立生物活性构象？随后打开 notebook，在新的输出目录中添加一个有效示例。",
    ),
    answer: b(
      "The isomeric SMILES distinguishes the defined stereocenter; molecular formula and mass do not. A 2D depiction and a hashed fingerprint provide no observed binding geometry. The notebook preserves unspecified stereochemistry rather than assigning it.",
      "Isomeric SMILES 区分已定义的立体中心，分子式和质量不区分。二维图与哈希指纹都不提供观测到的结合几何。Notebook 保留未指定的立体化学，不擅自赋值。",
    ),
    limit: b(
      "Depictions and descriptors were prepared with RDKit 2025.09.6 on 2026-10-26 from the existing authored inputs. No labels, model, affinity, efficacy or synthesis assessment is present.",
      "二维图和描述符于 2026-10-26 使用 RDKit 2025.09.6，由既有构造输入生成；不含标签、模型、亲和力、疗效或合成评估。",
    ),
    state: b("Label-free authored molecules", "无标签构造分子"),
    lesson: "representations/small-molecule-representations",
    lab: "molecule-representation-inspector",
    sources: [
      {
        label: "Representation inspector and exact settings",
        url: "/labs/molecule-representation-inspector/",
        date: "2026-09-08",
      },
      {
        label: "RDKit Book",
        url: "https://www.rdkit.org/docs/RDKit_Book.html",
        date: "2026-09-11",
      },
    ],
  },
  "mechanism-targets": {
    question: b(
      "Where does genetic support stop before a target claim?",
      "遗传支持在成为靶点主张之前止于何处？",
    ),
    mechanism: b(
      "Fine mapping distributes conditional support over variants. Connecting a variant to an effector gene and choosing a direction of intervention require additional assumptions and evidence. An association or a large PIP does not supply those links.",
      "精细定位在变异之间分配条件性支持。将变异连接到效应基因、选择干预方向，需要额外假设与证据。关联或较高的 PIP 本身不提供这些连接。",
    ),
    worked: b(
      "The constructed PIPs 0.44, 0.27, 0.16, 0.08 and 0.05 sum to 1 under a one-causal-variant model. The first four sum to 0.95. That credible set contains candidate variants, not four validated genes or targets.",
      "构造 PIP 为 0.44、0.27、0.16、0.08、0.05，在单一因果变异模型下总和为 1。前四项总和为 0.95。该可信集包含候选变异，而不是四个已验证基因或靶点。",
    ),
    task: b(
      "Trace the unanswered variant-to-gene and gene-to-phenotype links. Write a competing effector-gene explanation and a context-matched observation that could distinguish it.",
      "沿图找出未解决的变异到基因、基因到表型连接。写出一个竞争的效应基因解释，以及能区分它的情境匹配观察。",
    ),
    answer: b(
      "Keep a second effector gene and detection or viability effects open until the relevant bridge is tested. A perturbation can test a gene-dependent phenotype in one context; it does not retroactively identify the causal variant.",
      "在检验相关连接之前，应保留第二个效应基因及检测或存活影响等解释。扰动可检验某情境下依赖基因的表型，却不能反向确定因果变异。",
    ),
    limit: b(
      "The PIPs are constructed. Inference depends on the candidate set, LD, prior and model. The displayed sequence labels evidence questions rather than established biological causality.",
      "这些 PIP 为构造值。推断依赖候选集、LD、先验与模型。图中的顺序标记证据问题，不表示已建立的生物因果关系。",
    ),
    state: b("Constructed conditional evidence", "构造的条件性证据"),
    lesson: "mechanism-targets/genetics-to-target-evidence",
    lab: "l1000-perturbation-context",
    sources: [
      {
        label: "Genetic evidence worked cases and assumptions",
        url: "/learn/mechanism-targets/genetics-to-target-evidence/",
        date: "2026-09-09",
      },
      {
        label: "Perturbation-to-target validation",
        url: "/learn/mechanism-targets/perturbation-to-target-validation/",
        date: "2026-09-09",
      },
    ],
  },
  "qsar-properties": {
    question: b(
      "Does the representation ranking survive an assay change?",
      "表示方法的排序能否经受 assay 改变？",
    ),
    mechanism: b(
      "A molecular representation predicts a declared endpoint for a declared population. Switching assay can change the label-generating system as well as the chemical population. A common target name does not make the evaluations interchangeable.",
      "分子表示为指定总体预测指定终点。切换 assay 可能同时改变标签生成系统和化学总体。共享靶点名称不意味着评估可以互换。",
    ),
    worked: b(
      "The frozen primary comparison has 132 parents and favors Morgan Ridge by MAE. The separate-assay comparison has 170 parents and favors descriptor Ridge; Morgan MAE rises to 3.1316760122202343. Select each population to read all three controls together.",
      "冻结的主要比较包含 132 个 parent，按 MAE 看 Morgan Ridge 较好。独立 assay 比较包含 170 个 parent，descriptor Ridge 较好；Morgan MAE 升至 3.1316760122202343。切换总体，完整比较三个方法。",
    ),
    task: b(
      "Read the reversal before explaining it. Name one label/assay hypothesis and one representation/domain hypothesis, then identify a diagnostic that does not retune on evaluation labels.",
      "先读取排序反转，再解释它。各写出一个标签或 assay 假设与一个表示或适用域假设，并指出一种不在评估标签上重新调参的诊断。",
    ),
    answer: b(
      "Inspect endpoint definitions, assay conditions and entity/grouping contracts before assigning the failure to chemistry or regularization. Compare source metadata and prespecified domain warnings; these aggregate scores alone cannot identify the cause.",
      "在将失败归因于化学或正则化之前，应检查终点定义、assay 条件与实体分组契约。可比较源元数据和预先声明的适用域警示；仅这些汇总分数不能识别原因。",
    ),
    limit: b(
      "The result is descriptive. T15 had exposed shared labels before T05 evaluation; this is not untouched confirmation. No confidence interval, pooled-assay superiority or per-sample residual view is supplied here.",
      "结果是描述性的。T05 评估前 T15 已接触共享标签，因此不属于完全未暴露的确认。不提供置信区间、合并 assay 优越性或逐样本残差图。",
    ),
    state: b("Retained frozen result", "保留的冻结结果"),
    lesson: "qsar-properties/property-prediction",
    lab: "chembl-egfr-representation-baselines",
    sources: [
      {
        label: "Frozen ChEMBL EGFR baseline results and protocol",
        url: "/labs/chembl-egfr-representation-baselines/",
        date: "2026-09-08",
      },
      {
        label: "Assay-shift diagnosis",
        url: "/learn/evaluation-and-reproducibility/assay-shift-diagnosis/",
        date: "2026-09-09",
      },
    ],
  },
  "admet-pk": {
    question: b(
      "Can a larger total exposure imply a larger response?",
      "总暴露更高就意味着响应更大吗？",
    ),
    mechanism: b(
      "For a one-compartment model with first-order elimination, C(t) = (A0/V) exp(−CL t/V). Clearance has volume/time units; CL/V has inverse-time units. The unbound fraction creates a separate exposure quantity.",
      "在一室、一级消除模型中，C(t) = (A0/V) exp(−CL t/V)。清除率单位为体积/时间，CL/V 单位为时间的倒数。游离比例定义了另一种暴露量。",
    ),
    worked: b(
      "The existing constructed compounds share A0 = 40 µmol and V = 20 L. A has CL = 2 L/h and fu = 0.05; B has CL = 4 L/h and fu = 0.20. A has larger total AUC, but B has larger unbound AUC under these complete assumed parameter sets.",
      "既有构造化合物共享 A0 = 40 µmol、V = 20 L。A 的 CL = 2 L/h、fu = 0.05，B 的 CL = 4 L/h、fu = 0.20。在这两组完整假设参数下，A 的总 AUC 更大，但 B 的游离 AUC 更大。",
    ),
    task: b(
      "Switch between total and unbound curves. Compare both compounds at 6.931 h. State what additional evidence would be needed to connect either curve to a functional response.",
      "切换总浓度与游离浓度曲线，比较 6.931 h 时的两个化合物。指出将曲线连接到功能响应还需要哪些证据。",
    ),
    answer: b(
      "At one A half-life, A and B total concentrations are approximately 1 and 0.5 µmol/L; unbound concentrations are 0.05 and 0.10. Target-site exposure, response coupling, timing and independent functional measurements are not supplied by that arithmetic.",
      "在 A 的一个半衰期时，A、B 总浓度约为 1、0.5 µmol/L，游离浓度为 0.05、0.10。该算式不提供靶位暴露、响应耦合、时序或独立功能测量。",
    ),
    limit: b(
      "All curve parameters are constructed, not measured or physiological estimates. This is not a dosing recommendation, validated species translation, causal effect of changing binding, or clinical benefit prediction.",
      "曲线参数均为构造值，不是测量值或生理估计。这不是剂量建议、已验证的物种转换、改变结合的因果效应或临床获益预测。",
    ),
    state: b("Constructed parameter model", "构造参数模型"),
    lesson: "admet-pk/exposure-clearance-pkpd",
    lab: "pkpd-translation-audit",
    sources: [
      {
        label: "One-compartment worked curve and complete assumptions",
        url: "/learn/admet-pk/exposure-clearance-pkpd/",
        date: "2026-09-12",
      },
    ],
  },
  "dti-screening": {
    question: b(
      "What does an enriched shortlist permit you to conclude?",
      "富集的候选列表允许得出什么结论？",
    ),
    mechanism: b(
      "Ranking prioritizes a finite library under a label definition. EF at top k compares the observed active fraction with the original library prevalence. Binder classification, affinity regression and a pose hypothesis are different outputs.",
      "排序在指定标签定义下为有限库分配优先级。Top k 的 EF 将观察到的活性比例与原库流行率比较。结合分类、亲和力回归和 pose 假设是不同输出。",
    ),
    worked: b(
      "The existing constructed library has 1000 compounds and 20 actives. Eight actives in the top 50 give EF50 = (8/50)/(20/1000) = 8. The marked positions below illustrate those counts; they are not retained ranking predictions.",
      "既有构造库含 1000 个化合物、20 个活性物。Top 50 中有 8 个活性物，EF50 = (8/50)/(20/1000) = 8。下方标记位置用于说明计数，不是保留的排序预测。",
    ),
    task: b(
      "Read the active and inactive counts. If a new library changes prevalence, explain why the old EF or positive predictive value cannot simply be copied. Name the missing evidence between a pose and binding.",
      "读取活性和非活性计数。如果新库改变了流行率，解释为何不能直接照搬旧 EF 或阳性预测值，并指出 pose 与结合之间缺少哪种证据。",
    ),
    answer: b(
      "EF is conditional on k, library composition and labels. A pose needs its target state, ligand assumptions and an appropriate independent binding observation before supporting a binding claim; a docking score does not supply it.",
      "EF 依赖 k、库组成和标签。Pose 要支持结合主张，必须保留靶点状态、配体假设，并获得适当的独立结合观察；docking 分数不能补足它。",
    ),
    limit: b(
      "The library, labels and marked positions are constructed. Enrichment is not affinity, target engagement, a prospective hit rate or experimental validation.",
      "库、标签与标记位置均为构造值。富集不等于亲和力、靶点占有、前瞻命中率或实验验证。",
    ),
    state: b("Constructed shortlist", "构造候选列表"),
    lesson: "dti-screening/screening-prevalence-and-transfer",
    lab: "binder-definition",
    sources: [
      {
        label: "Screening prevalence and constructed shortlist",
        url: "/learn/dti-screening/screening-prevalence-and-transfer/",
        date: "2026-09-09",
      },
    ],
  },
  "structure-and-pockets": {
    question: b(
      "Which pocket depends on the ligand and receptor state?",
      "口袋定义如何依赖配体和受体状态？",
    ),
    mechanism: b(
      "The view reads deposited EGFR coordinates, not a predicted protein cartoon. A contact set is defined by a ligand, atom selection and cutoff. Reference-sequence mapping makes residue identity comparable across deposited numbering conventions.",
      "此视图读取已存档的 EGFR 坐标，而不是预测蛋白示意图。接触集合由配体、原子选择和阈值定义。映射到参考序列后，才能跨不同存档编号比较残基身份。",
    ),
    worked: b(
      "1M17 and 4HJO contain erlotinib; 1XKK contains lapatinib. Met793 in P00533 is author residue 769 in the first two files and 793 in 1XKK. Select an entry and nearby residue to inspect geometry without silently merging those numbers.",
      "1M17、4HJO 含 erlotinib，1XKK 含 lapatinib。P00533 的 Met793 在前两个文件中的作者编号是 769，在 1XKK 中是 793。选择结构和邻近残基，在检查几何时保留这两种编号。",
    ),
    task: b(
      "Compare a ligand-adjacent residue across entries. Record chain, author number, reference number and minimum heavy-atom distance. Explain why a distance alone cannot establish a hydrogen bond or a state assignment.",
      "跨结构比较一个邻近配体的残基，记录链、作者编号、参考编号及最短重原子距离。解释为何单一距离不能建立氢键或状态判定。",
    ),
    answer: b(
      "Distance is geometry under an atom-selection convention. Protonation, donor/acceptor roles, waters and experimental-model uncertainty remain separate. The coordinates contain no resolved hydrogens; the original lab makes those interaction assumptions explicit.",
      "距离是在原子选择约定下的几何量。质子化、供体受体角色、水及实验模型不确定性需要分别处理。这些坐标没有解析出的氢原子；原实验明确列出了相互作用假设。",
    ),
    limit: b(
      "This is a lightweight orthographic coordinate inspector with a C-alpha trace and ligand heavy atoms. It performs no preparation, docking, protonation, minimization or affinity calculation. Missing stretches are not connected.",
      "这是轻量正交坐标检查器，显示 Cα 轨迹和配体重原子，不执行结构准备、docking、质子化、最小化或亲和力计算。缺失区段不连接。",
    ),
    state: b("Experimental coordinate projection", "实验坐标投影"),
    lesson: "structure-and-pockets/pocket-states-and-confidence",
    lab: "egfr-structure-evidence",
    sources: [
      {
        label: "Retained EGFR structures, original citations and inspection",
        url: "/labs/egfr-structure-evidence/",
        date: "2026-09-11",
      },
      {
        label: "PDB 1M17",
        url: "https://www.rcsb.org/structure/1M17",
        date: "2026-09-11",
      },
      {
        label: "PDB 4HJO",
        url: "https://www.rcsb.org/structure/4HJO",
        date: "2026-09-11",
      },
      {
        label: "PDB 1XKK",
        url: "https://www.rcsb.org/structure/1XKK",
        date: "2026-09-11",
      },
    ],
  },
  "physics-based-modeling": {
    question: b(
      "Is one coordinate frame a new molecular system?",
      "一个坐标帧就是一个新的分子系统吗？",
    ),
    mechanism: b(
      "A frame is a configuration nested within a molecular system. The source geometry changes while atomic composition stays fixed. Fitting an energy model within each system is different from transferring one fitted model between systems.",
      "帧是嵌套在分子系统中的构型。源几何变化时，原子组成保持固定。在每个系统内部拟合能量模型，不等于将同一个已拟合模型迁移到不同系统。",
    ),
    worked: b(
      "The geometry inspector shows three existing ethanol source rows, without energies or partition membership. The separate retained evaluation below reports energy MAE for benzene and uracil, each with its own train-fitted model and 200 evaluation frames.",
      "几何检查器显示既有乙醇的三个源行，不显示能量或分区成员。下方另行给出保留的 benzene、uracil 评估能量 MAE；两者各有自己的仅训练集拟合模型和 200 个评估帧。",
    ),
    task: b(
      "Switch the source frame and viewing direction. Identify which operation changes physical geometry and which changes only its projection. Then state the independent unit of a cross-system claim.",
      "切换源帧和观察方向，指出哪个操作改变物理几何、哪个只改变投影，并说明跨系统主张的独立单位。",
    ),
    answer: b(
      "Switching a frame changes atomic coordinates; rotating the camera preserves all pair distances. Molecular systems, not correlated frames, are the independent unit relevant to a cross-system claim. Two within-system evaluations do not establish zero-shot transfer.",
      "切换帧会改变原子坐标，旋转视角则保留所有原子对距离。跨系统主张的独立单位是分子系统，不是相关的帧。两个系统内评估不能建立零样本迁移。",
    ),
    limit: b(
      "No source time scale is inferred from row numbers. No training or frozen evaluation was rerun. Per-frame Ridge predictions were not retained in the original evaluation and remain unavailable; only aggregate energy errors are displayed.",
      "不从源行号推断时间尺度；没有重跑训练或冻结评估。原评估未保留逐帧 Ridge 预测，它们仍不可用，因此只显示汇总能量误差。",
    ),
    state: b("Source geometry + retained aggregates", "源几何与保留汇总"),
    lesson: "physics-based-modeling/physical-model-system-state",
    lab: "rmd17-system-state-energy-baselines",
    sources: [
      {
        label: "rMD17 frozen protocol and aggregate results",
        url: "/labs/rmd17-system-state-energy-baselines/",
        date: "2026-09-08",
      },
      {
        label: "rMD17 source record, version 4",
        url: "https://doi.org/10.6084/m9.figshare.12672038.v4",
        date: "2026-02-28",
      },
    ],
  },
  "molecular-generation": {
    question: b(
      "Can a high score compensate for a failed hard constraint?",
      "高分能补偿未通过的硬约束吗？",
    ),
    mechanism: b(
      "A generator proposes objects. Checkers define validity and exclusions. Ranking compares survivors under fixed objectives. Pareto dominance requires no worse performance on every declared objective and improvement on at least one.",
      "生成器提出对象；检查器定义有效性和排除条件；排序在固定目标下比较幸存项。Pareto 支配要求所有声明目标均不差，且至少一项更好。",
    ),
    worked: b(
      "In the existing constructed A/B/C case, both a and b are maximized. B has attractive scores but h = 0.68 fails h ≥ 0.70. C dominates A in the score plane, but distance 0.08 fails the second-member threshold 0.20 after A is fixed.",
      "在既有 A/B/C 构造例中，a、b 均越高越好。B 的分数优良，但 h = 0.68 未满足 h ≥ 0.70。C 在分数平面支配 A，但在先选定 A 后，距离 0.08 未达到第二成员阈值 0.20。",
    ),
    task: b(
      "Identify the dominating point and the failed gate. Then inspect the separate authored molecule gallery. Explain why no correspondence may be invented between those structures and A/B/C's synthetic scores.",
      "识别支配点与未通过的约束，再检查另行展示的构造分子图库。解释为何不能将这些结构随意对应到 A/B/C 的合成分数。",
    ),
    answer: b(
      "C dominates A on a and b, but eligibility still depends on the declared policy. B is excluded before ranking. The molecule gallery belongs to a different label-free gate exercise; no A/B/C score or biological property is assigned to it.",
      "C 在 a、b 上支配 A，但资格仍取决于声明策略。B 在排序前已被排除。分子图库属于另一项无标签约束练习，不为它们赋予 A/B/C 分数或生物性质。",
    ),
    limit: b(
      "A/B/C values and the molecule set are authored teaching inputs, kept separate. No generative model or experiment was run, no candidate is proposed for synthesis, and no score is a measured biological endpoint.",
      "A/B/C 数值与分子集均为作者构造的教学输入，并保持分离。没有运行生成模型或实验，不提出合成候选，任何分数都不是测得的生物终点。",
    ),
    state: b("Constructed constrained search", "构造约束搜索"),
    lesson: "molecular-generation/flows-and-constrained-search",
    lab: "generation-gate",
    sources: [
      {
        label: "Constrained search and A/B/C worked case",
        url: "/learn/molecular-generation/flows-and-constrained-search/",
        date: "2026-09-09",
      },
      {
        label: "Authored molecules and frozen gate definitions",
        url: "/labs/generation-gate/",
        date: "2026-09-10",
      },
    ],
  },
  "biologics-design": {
    question: b(
      "Does a domain assembly identify the object or validate its function?",
      "结构域组装能识别对象，还是能验证功能？",
    ),
    mechanism: b(
      "A modality is broader than a construct. Preserve component identity, assembly and expression host, then keep sequence recovery, structural plausibility, binding and functional response as distinct evidence questions.",
      "模态比构造更宽泛。应保留组分身份、组装形式和表达宿主，再将序列恢复、结构合理性、结合和功能响应作为不同证据问题。",
    ),
    worked: b(
      "The source labels describe etanercept as a dimeric receptor–Fc fusion and adalimumab as a human IgG1 monoclonal antibody. Both name CHO expression, but the shared host does not make them the same construct or establish interchangeable action.",
      "来源标签将 etanercept 描述为二聚体 receptor–Fc 融合蛋白，将 adalimumab 描述为人 IgG1 单克隆抗体。两者均注明 CHO 表达，但共同宿主不使其构造相同，也不建立作用可互换性。",
    ),
    task: b(
      "Trace the receptor and Fc components in the schematic. State which component recognizes the partner, what the source's functional claim is, and which assay would be needed for a new design's binding claim.",
      "沿示意图区分受体和 Fc 组分，指出哪个组分识别配体、来源给出的功能主张是什么，以及新设计的结合主张需要何种 assay。",
    ),
    answer: b(
      "Etanercept retains the extracellular ligand-binding part of p75 TNF receptor and an IgG1 Fc component. The label reports preventing TNF binding to cell-surface receptors. A new design still needs its own construct-matched binding and functional observations.",
      "Etanercept 保留 p75 TNF 受体的胞外配体结合部分及 IgG1 Fc 组分。标签记载其阻止 TNF 与细胞表面受体结合。新设计仍需自身的构造匹配结合和功能观察。",
    ),
    limit: b(
      "The domain drawing is a source-grounded schematic, not experimental coordinates or a sequence-length map. The six-entity matrix reports selected source fields, not therapeutic quality, clinical comparisons or independently measured function.",
      "结构域图是基于来源的示意图，不是实验坐标或序列长度图。六实体矩阵报告所选来源字段，而不是治疗质量、临床比较或独立测得的功能。",
    ),
    state: b("Source-reported constructs", "来源记载的构造"),
    lesson: "biologics-design/construct-identity-and-objectives",
    lab: "biologic-construct-audit",
    sources: [
      {
        label: "Construct identity and exact label scope",
        url: "/learn/biologics-design/construct-identity-and-objectives/",
        date: "2026-09-11",
      },
      {
        label: "Six-entity source-record audit",
        url: "/labs/biologic-construct-audit/",
        date: "2026-10-23",
      },
    ],
  },
  "synthesis-and-automation": {
    question: b(
      "What is recovered by a retrosynthetic graph edit?",
      "逆合成图编辑恢复了什么？",
    ),
    mechanism: b(
      "A retrosynthetic step proposes reactant graphs from a product graph. Matching an authored disconnection tests recovery under that representation. Laboratory feasibility additionally depends on conditions, selectivity, materials, scale and observed feedback.",
      "逆合成步骤从产物图提出反应物图。匹配构造断键方案检验该表示下的恢复情况。实验室可行性还依赖条件、选择性、材料、规模与实际反馈。",
    ),
    worked: b(
      "The existing authored p01 case records acetanilide CC(=O)Nc1ccccc1 with acetic acid CC(=O)O and aniline Nc1ccccc1. These structures visualize the recorded amide disconnection, not a reaction that was performed.",
      "既有构造例 p01 记录产物 acetanilide CC(=O)Nc1ccccc1，以及 acetic acid CC(=O)O 和 aniline Nc1ccccc1。这些结构显示记录的酰胺断键，不是已经进行的反应。",
    ),
    task: b(
      "Read the product-to-reactant direction, then list three unresolved feasibility fields. Explain how a failed measurement differs from a failed reaction in a future loop.",
      "读取从产物到反应物的方向，列出三个未解决的可行性字段，并说明未来循环中测量失败与反应失败有何不同。",
    ),
    answer: b(
      "Reagent availability, compatible conditions, selectivity, protecting groups, scale or cost remain unassessed. Missing or failed measurement is an observation-process state; it does not establish that the reaction failed or that yield was zero.",
      "试剂可得性、相容条件、选择性、保护基、规模或成本仍未评估。测量缺失或失败是观察过程状态，不意味着反应失败或收率为零。",
    ),
    limit: b(
      "This hand-authored single-step case has no experimental conditions, yield, automated execution or synthesis recommendation. The schematic arrow means retrosynthetic decomposition only.",
      "该手工构造的单步案例不含实验条件、收率、自动执行或合成建议。箭头仅表示逆合成分解。",
    ),
    state: b("Authored graph-edit case", "构造图编辑案例"),
    lesson: "synthesis-and-automation/reaction-mapping-and-route-search",
    lab: "retro-disconnection",
    sources: [
      {
        label: "Retrosynthetic disconnection and feasibility boundary",
        url: "/labs/retro-disconnection/",
        date: "2026-09-11",
      },
    ],
  },
  "active-learning": {
    question: b(
      "Does a policy recover more targets at the same budget?",
      "相同预算下，某策略是否恢复了更多目标？",
    ),
    mechanism: b(
      "The retained retrospective replay compares fixed policies on the same initial, pool and evaluation sets. Recovery divides acquired top-decile parents by the original top-decile count. Budget is an acquired-parent count, not a confidence level.",
      "保留的回顾性回放在相同初始集、池和评估集上比较固定策略。恢复率为已获取的原池 top-decile parent 数除以原 top-decile 总数。预算是获取的 parent 数，不是置信水平。",
    ),
    worked: b(
      "Switch assay and budget checkpoint. The plot keeps maxmin, every fixed random instance and the separately recorded ensemble-variance policy visible. At equal budget, more scaffold coverage need not mean more top-decile recovery.",
      "切换 assay 和预算检查点。图中保留 maxmin、每个固定 random 实例，以及另行记录的 ensemble-variance 策略。相同预算下，覆盖更多 scaffold 不一定恢复更多 top-decile 目标。",
    ),
    task: b(
      "Choose a checkpoint before looking at its outcome. Compare all policies on recovery and scaffold coverage, retain the negative comparison, and state whether the replay measured laboratory feedback.",
      "在查看结果之前选定检查点，比较所有策略的恢复率与 scaffold 覆盖，保留不利比较，并说明回放是否测量了实验室反馈。",
    ),
    answer: b(
      "All policies must use the same assay population and acquired-parent count. Fixed random instances are descriptive controls, not independent assays or an uncertainty band. Retrospective label lookup is not live laboratory feedback.",
      "所有策略必须使用相同 assay 总体和已获取 parent 数。固定 random 实例是描述性对照，不是独立 assay 或不确定性带。回顾性标签查询不是实时实验室反馈。",
    ),
    limit: b(
      "No replay, seed or policy was rerun or selected for this view. The uncertainty selector's ensemble variance is an acquisition statistic, not calibrated experimental uncertainty. No policy superiority or confidence interval is inferred.",
      "此视图没有重跑或筛选回放、seed 或策略。不确定性选择器的 ensemble variance 是获取统计量，不是校准后的实验不确定性。不推断策略优越性或置信区间。",
    ),
    state: b("Retained retrospective replay", "保留的回顾性回放"),
    lesson: "active-learning/experiment-pools-and-budgets",
    lab: "pool-budget-campaign",
    sources: [
      {
        label: "Frozen fixed-policy replay",
        url: "/labs/pool-budget-campaign/",
        date: "2026-09-08",
      },
      {
        label: "Separately frozen ensemble-variance comparison",
        url: "/labs/pool-budget-uncertainty-acquisition/",
        date: "2026-09-11",
      },
    ],
  },
  "scientific-agents": {
    question: b(
      "Which returned artifact supports the answer, and which stops it?",
      "哪个返回产物支持答案，哪个返回状态使推断停止？",
    ),
    mechanism: b(
      "Retrieval contributes source context. A tool request is an action proposal. Its typed return records an observation or failure state. Verification checks the declared contract and source support; it cannot turn a planned experiment into an observed one.",
      "检索提供来源上下文，工具请求是行动提议，带类型的返回记录观察或失败状态。验证检查声明契约与来源支持，不能把计划中的实验变成已观察到的实验。",
    ),
    worked: b(
      "The saved PaperQA run asked five teaching questions about two supplied papers. The selected negative control asks for a shared benchmark split that neither paper defines. The companion constructed tool trace returns qc_failed and control_pass: false.",
      "保留的 PaperQA 运行就两篇给定论文提出五个教学问题。所选阴性对照询问两篇论文均未定义的共同 benchmark split。配套构造工具轨迹返回 qc_failed 与 control_pass: false。",
    ),
    task: b(
      "Open the saved-source trace and the separate constructed failure branch. Identify which is an actual retained software record, then explain why neither a fluent answer nor schema validity proves a biological result.",
      "打开保留来源轨迹与另行构造的失败分支，指出哪个是实际保留的软件记录，再解释为何流畅答案或 schema 合法性都不能证明生物结果。",
    ),
    answer: b(
      "The PaperQA snapshot is an observed local software run under its recorded effective settings. The QC-failed branch is a teaching example and supplies no valid biological readout. Both require source- and scope-matched interpretation; neither measures autonomous laboratory success.",
      "PaperQA 快照是按记录的实际设置观察到的本地软件运行。QC 失败分支是教学示例，不提供有效生物读出。两者均须按来源和范围解释；均未测量自主实验室成功。",
    ),
    limit: b(
      "This is a reader of retained artifacts, without a live model endpoint. The saved modified settings validate that copy, not the published default. No benchmark accuracy, human grading or value of adaptivity was measured.",
      "本视图读取保留产物，不连接实时模型端点。保留的修改设置验证的是该副本，而不是发布默认值。没有测量 benchmark 准确率、人工评分或自适应价值。",
    ),
    state: b("Saved run + constructed failure", "保留运行与构造失败"),
    lesson: "scientific-agents/retrieval-tools-feedback",
    lab: "tool-contract-audit",
    sources: [
      {
        label: "Saved local-document PaperQA example",
        url: "/learn/scientific-agents/agent-resource-guide/",
        date: "2026-09-10",
      },
      {
        label: "Constructed typed failure trace",
        url: "/learn/scientific-agents/retrieval-tools-feedback/",
        date: "2026-09-09",
      },
    ],
  },
  "evaluation-and-reproducibility": {
    question: b(
      "What crosses a split, and what remains dependent within it?",
      "什么信息跨越了划分，哪些观测仍然相互依赖？",
    ),
    mechanism: b(
      "Membership, information use and the claim are separate. A shared parent can leak across row partitions. Fitted preprocessing can use held-out features without labels. Time ordering does not make nested frames independent molecular systems.",
      "成员归属、信息使用与主张是三回事。相同 parent 可跨行划分泄漏。拟合型预处理即使不使用标签，也可能吸收保留特征。时间排序不会使嵌套帧成为独立分子系统。",
    ),
    worked: b(
      "The constructed overlap display keeps A's records in one parent group or splits them by row. In the real frozen ChEMBL case, realized train/validation/evaluation counts are 634/136/132 because whole scaffold groups are preserved.",
      "构造重叠视图可将 A 的记录保留在同一 parent 组，或按行分散。在真实冻结 ChEMBL 案例中，实际训练/验证/评估计数为 634/136/132，因为保留了完整 scaffold 组。",
    ),
    task: b(
      "Switch the grouping display. Name the shared identity, the statistic allowed to see training data only, and the narrow population statement supported by a scaffold-disjoint evaluation.",
      "切换分组显示，写出共享身份、仅允许读取训练数据的统计量，以及 scaffold 不重叠评估可支持的较窄总体表述。",
    ),
    answer: b(
      "Parent A crosses the row split. Imputer medians, scaler means and scales are train-fitted. The real comparison evaluates held-out scaffold keys within one primary assay; disjoint keys do not establish independence or transport to every future assay.",
      "Parent A 跨越了按行划分。填补中位数、缩放均值与尺度均只能由训练数据拟合。真实比较在主要 assay 内评估保留 scaffold key；key 不重叠不能建立独立性或对所有未来 assay 的迁移。",
    ),
    limit: b(
      "The overlap rows are a constructed control, not leaked author data. The frozen cases include prior shared-label exposure and correlated frames. Reorganizing files does not create unseen confirmation.",
      "重叠行是构造对照，不是发生泄漏的作者数据。冻结案例包含先前共享标签暴露与相关帧。重排文件不会产生未见过的确认数据。",
    ),
    state: b("Constructed control + frozen case", "构造对照与冻结案例"),
    lesson: "evaluation-and-reproducibility/split-and-leakage-cases",
    lab: "split-leakage-audit",
    sources: [
      {
        label: "Membership, fitting and exposure cases",
        url: "/learn/evaluation-and-reproducibility/split-and-leakage-cases/",
        date: "2026-09-08",
      },
    ],
  },
  "candidate-nomination": {
    question: b(
      "Can a numerical advantage close a missing safety requirement?",
      "数值优势能填补缺失的安全性要求吗？",
    ),
    mechanism: b(
      "A nomination dossier combines endpoint-specific evidence under a predeclared rule. Hard requirements are logical conditions, not columns to average. A missing requirement remains unresolved even when every numerical score passes.",
      "提名档案在预先声明的规则下整合终点特异证据。硬要求是逻辑条件，不是用于取均值的列。即使所有数值均达标，缺失要求仍未解决。",
    ),
    worked: b(
      "The existing constructed workbook uses potency ≤ 50 nM, selectivity ratio ≥ 20 and compatible exposure ratio ≥ 3, plus reviewed safety and interpretable functional validation. N3 passes the numeric gates but has no required safety package.",
      "既有构造工作簿采用 potency ≤ 50 nM、selectivity ratio ≥ 20、相容 exposure ratio ≥ 3，并要求已审查安全性及可解释功能验证。N3 通过数值门槛，却没有要求的安全性包。",
    ),
    task: b(
      "Inspect the dossier matrix. Distinguish revising N1, closing N2's exposure gap and requesting N3's missing safety evidence. State whether any candidate satisfies the complete rule.",
      "检查档案矩阵，区分修改 N1、处理 N2 的暴露不足与请求 N3 缺失安全性证据这三类行动，并判断是否有候选满足完整规则。",
    ),
    answer: b(
      "N1 fails selectivity; N2 fails the exposure rule; N3's safety requirement is unresolved. None satisfies the complete teaching rule. A weighted average cannot replace a required safety observation, and changing thresholds after inspection changes the decision.",
      "N1 未通过选择性要求，N2 未通过暴露要求，N3 的安全性要求未解决。没有候选满足完整教学规则。加权均值不能取代必需的安全性观察，查看结果后修改阈值会改变决策。",
    ),
    limit: b(
      "All candidates, thresholds and ratios are constructed and context-specific. The matrix is a decision-reasoning exercise, not a therapeutic recommendation, safety assessment or candidate discovery.",
      "所有候选、阈值和比值均为特定情境下的构造值。矩阵用于决策推理练习，不是治疗建议、安全性评估或候选发现。",
    ),
    state: b("Constructed candidate dossier", "构造候选档案"),
    lesson: "candidate-nomination/capstone-workbook",
    lab: "nomination-readiness-audit",
    sources: [
      {
        label: "Five-case workbook, case 5",
        url: "/learn/candidate-nomination/capstone-workbook/#case-5--cross-domain-nomination-with-a-missing-requirement",
        date: "2026-09-09",
      },
    ],
  },
};
export function localTeachingText(value: Bilingual, chinese = false): string {
  return chinese ? value.zh : value.en;
}
