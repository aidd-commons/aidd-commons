/** Deterministic stage walkthroughs of the actual native figure exports.
 * From root: node node_modules/tsx/dist/cli.mjs site/scripts/export-figure-motions.ts
 * Native stage bounds come from build_schematic_masters.mjs --source-record.
 * Only navigation is translated; all scientific labels remain in the native crop.
 * No SVG file is written, and the three existing Science Stories are untouched.
 */
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  figureMotionMedia,
  type FigureMotionId,
  type FigureMotionLocale,
} from "../src/lib/figure-motion-media.js";

const site = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(site, "..");
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const destination = resolve(
  arg("--destination") ?? join(site, "public/media/figures"),
);
const receiptPath = resolve(
  arg("--receipt") ??
    join(root, "tmp/figure-refinement-20261107/motion-export-receipt.json"),
);
const figures = (
  arg("--figure")
    ? [arg("--figure")]
    : ["decision-pipeline", "frozen-lifecycle"]
) as FigureMotionId[];
const locales = (
  arg("--locale") ? [arg("--locale")] : ["en", "zh-cn"]
) as FigureMotionLocale[];
if (
  figures.some(
    (id) => !["decision-pipeline", "frozen-lifecycle"].includes(id),
  ) ||
  locales.some((id) => !["en", "zh-cn"].includes(id))
)
  throw new Error("Unknown figure or locale");
const previewOnly = process.argv.includes("--preview-only");
const width = 1600,
  height = 1080,
  fps = 15;
const definitions = {
  "decision-pipeline": {
    key: "S3",
    number: 3,
    stem: "schematic-03-decision-pipeline",
    title: {
      en: "Target-to-candidate decisions",
      "zh-cn": "从靶点到候选物的决策",
    },
  },
  "frozen-lifecycle": {
    key: "S7",
    number: 14,
    stem: "schematic-07-frozen-lifecycle",
    title: {
      en: "Frozen evaluation lifecycle",
      "zh-cn": "冻结评估流程",
    },
  },
} as const;
type Bounds = { x: number; y: number; w: number; h: number };
type MotionStage = {
  name: string;
  bounds_mm: Bounds;
  detail_bounds_mm?: Bounds;
};
interface SourceRecord {
  configs: {
    key: string;
    stem: string;
    width: number;
    height: number;
    native_contract: { scene_revision: string };
  }[];
  motion: Record<
    string,
    {
      duration_seconds: number;
      reading_direction: string;
      stages: MotionStage[];
    }
  >;
}
function run(command: string, args: string[]) {
  const r = spawnSync(command, args, {
    encoding: "utf8",
    cwd: root,
    maxBuffer: 4_000_000,
  });
  if (r.status !== 0)
    throw new Error(`${command}: ${r.stderr || r.error?.message}`);
  return r.stdout.trim();
}
const source = JSON.parse(
  run(process.execPath, [
    join(root, "report/figures/build_schematic_masters.mjs"),
    "--source-record",
  ]),
) as SourceRecord;
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const imageHref = (buffer: Buffer) =>
  `data:image/png;base64,${buffer.toString("base64")}`;
function probe(path: string) {
  return JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-count_frames",
      "-show_entries",
      "format=duration:stream=codec_name,width,height,nb_frames,nb_read_frames,r_frame_rate",
      "-of",
      "json",
      path,
    ]),
  );
}
async function frameError(actual: string, expected: Buffer) {
  const image = await sharp(actual)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const reference = await sharp(expected)
    .resize(image.info.width, image.info.height)
    .removeAlpha()
    .raw()
    .toBuffer();
  let difference = 0;
  for (let i = 0; i < reference.length; i++)
    difference += Math.abs(image.data[i] - reference[i]);
  return Number((difference / reference.length).toFixed(4));
}
if (process.argv.includes("--check")) {
  let checked = 0;
  for (const figure of figures)
    for (const locale of locales) {
      const media = figureMotionMedia(figure, locale);
      for (const format of ["mp4", "webm", "gif", "webp"]) {
        const path = join(destination, `${figure}-${locale}.${format}`);
        if (!(await stat(path)).isFile() || (await stat(path)).size === 0)
          throw new Error(`Missing figure media: ${path}`);
        if (format === "webp") {
          const poster = await sharp(path).metadata();
          if (poster.width !== width || poster.height !== height)
            throw new Error(`Incorrect poster dimensions: ${path}`);
        } else {
          const metadata = probe(path);
          const stream = metadata.streams[0];
          const gif = format === "gif";
          if (
            Math.abs(Number(metadata.format.duration) - media.durationSeconds) >
              0.01 ||
            stream.width !== (gif ? 960 : width) ||
            stream.height !== (gif ? 648 : height) ||
            Number(stream.nb_read_frames) !==
              media.durationSeconds * (gif ? 10 : fps)
          )
            throw new Error(
              `Incorrect figure movie duration, size, or frame count: ${path}`,
            );
        }
        checked++;
      }
    }
  console.log(
    `Verified ${checked} existing figure media files; no files changed.`,
  );
  process.exit(0);
}
await mkdir(destination, { recursive: true });
const scratch = await mkdtemp(join(tmpdir(), "aidd-figure-motion-"));
const receipt = {
  generatedAt: new Date().toISOString(),
  tool: run("ffmpeg", ["-version"]).split("\n")[0],
  source: "report/figures/build_schematic_masters.mjs --source-record",
  rendering:
    "Native exported overview and native stage crop; translated navigation only",
  evidenceBoundary:
    "Conceptual stage order, not experimental time or new measurements",
  frameRate: fps,
  width,
  height,
  previewOnly,
  entries: [] as unknown[],
};
try {
  for (const figure of figures) {
    const definition = definitions[figure];
    const config = source.configs.find((c) => c.key === definition.key);
    const motion = source.motion?.[definition.key];
    const media = figureMotionMedia(figure, "en");
    if (
      !config ||
      config.stem !== definition.stem ||
      !motion ||
      motion.stages.length !== media.stepCount ||
      motion.duration_seconds !== media.durationSeconds
    )
      throw new Error(`Missing or mismatched native motion source: ${figure}`);
    const sourcePath = join(root, "report/figures/out", `${config.stem}.png`);
    const native = await readFile(sourcePath);
    const nativeMetadata = await sharp(native).metadata();
    if (!nativeMetadata.width || !nativeMetadata.height)
      throw new Error(`Invalid native image: ${sourcePath}`);
    if (
      Math.abs(
        nativeMetadata.width / nativeMetadata.height -
          config.width / config.height,
      ) > 0.01
    )
      throw new Error(
        `Native image has an obsolete aspect ratio: ${sourcePath}`,
      );
    const box = { x: 30, y: 105, w: 1000, h: 866 };
    const scale = Math.min(box.w / config.width, box.h / config.height);
    const overview = {
      x: box.x + (box.w - config.width * scale) / 2,
      y: box.y + (box.h - config.height * scale) / 2,
      w: config.width * scale,
      h: config.height * scale,
    };
    const overviewHref = imageHref(
      await sharp(native)
        .resize(Math.round(overview.w), Math.round(overview.h))
        .png()
        .toBuffer(),
    );
    const crops = await Promise.all(
      motion.stages.map(async (stage) => {
        const b = stage.detail_bounds_mm ?? stage.bounds_mm;
        if (
          !stage.name ||
          Object.values(b).some((v) => !Number.isFinite(v)) ||
          b.x < 0 ||
          b.y < 0 ||
          b.w <= 0 ||
          b.h <= 0 ||
          b.x + b.w > config.width ||
          b.y + b.h > config.height
        )
          throw new Error(`Invalid native stage bounds: ${stage.name}`);
        const x = Math.round((b.x / config.width) * nativeMetadata.width!);
        const y = Math.round((b.y / config.height) * nativeMetadata.height!);
        const w = Math.min(
          nativeMetadata.width! - x,
          Math.round((b.w / config.width) * nativeMetadata.width!),
        );
        const h = Math.min(
          nativeMetadata.height! - y,
          Math.round((b.h / config.height) * nativeMetadata.height!),
        );
        const factor = Math.min(460 / w, 610 / h);
        return {
          href: imageHref(
            await sharp(native)
              .extract({ left: x, top: y, width: w, height: h })
              .resize(Math.round(w * factor), Math.round(h * factor))
              .png()
              .toBuffer(),
          ),
          w: w * factor,
          h: h * factor,
        };
      }),
    );
    for (const locale of locales) {
      const zh = locale === "zh-cn";
      const frames = join(scratch, `${figure}-${locale}`);
      await mkdir(frames);
      const frameBuffers: Buffer[] = [];
      const labels = {
        title: `${zh ? "图" : "FIGURE"} ${definition.number} · ${definition.title[locale]}`,
        focus: zh
          ? "当前阶段 · 原生图局部放大"
          : "CURRENT STAGE · NATIVE FIGURE DETAIL",
        order: zh
          ? "逐步展示阶段顺序，不表示实验耗时。"
          : "Steps show stage order, not elapsed experimental time.",
        boundary: zh
          ? "概念演示 · 英文科学标签为准 · 并非实验观测"
          : "CONCEPTUAL WALKTHROUGH · CANONICAL ENGLISH LABELS · NOT EXPERIMENTAL OBSERVATIONS",
      };
      for (let i = 0; i < motion.stages.length; i++) {
        const b = motion.stages[i].bounds_mm;
        const crop = crops[i];
        const numberedSteps = motion.stages
          .map((_, step) => {
            const x = 1098 + step * (440 / media.stepCount);
            const current = step === i;
            return `<circle cx="${x}" cy="886" r="${current ? 19 : 15}" fill="${current ? "#087c78" : "#fff"}" stroke="${current ? "#087c78" : "#536675"}" stroke-width="${current ? 3 : 1.5}"/><text x="${x}" y="892" text-anchor="middle" fill="${current ? "#fff" : "#536675"}" font-size="${current ? 19 : 16}" font-weight="${current ? 700 : 400}">${step + 1}</text>`;
          })
          .join("");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#fff"/><g font-family="Arial,'PingFang SC','Noto Sans CJK SC',sans-serif" fill="#13283d"><text x="34" y="52" font-size="32" font-weight="700">${escape(labels.title)}</text><path d="M34 78H1566" stroke="#ccd4d3"/><image href="${overviewHref}" x="${overview.x}" y="${overview.y}" width="${overview.w}" height="${overview.h}"/><rect x="${overview.x + b.x * scale - 4}" y="${overview.y + b.y * scale - 4}" width="${b.w * scale + 8}" height="${b.h * scale + 8}" fill="none" stroke="#087c78" stroke-width="4"/><path d="M1060 108V960" stroke="#ccd4d3"/><text x="1094" y="145" font-size="20" fill="#536675">${escape(labels.focus)}</text><text x="1094" y="195" font-size="34" font-weight="700">${zh ? "阶段" : "STEP"} ${String(i + 1).padStart(2, "0")} / ${media.stepCount}</text><image href="${crop.href}" x="${1094 + (460 - crop.w) / 2}" y="${230 + (610 - crop.h) / 2}" width="${crop.w}" height="${crop.h}"/>${numberedSteps}<path d="M1094 938H1554" stroke="#ccd4d3"/><text x="34" y="1006" font-size="23" fill="#536675">${escape(labels.order)}</text><text x="34" y="1044" font-size="18" fill="#536675">${escape(labels.boundary)}</text></g></svg>`;
        const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
        frameBuffers.push(buffer);
        await writeFile(
          join(frames, `${String(i).padStart(2, "0")}.png`),
          buffer,
        );
      }
      const stem = join(destination, `${figure}-${locale}`);
      // The poster is the actual final stage frame, not a separate illustration.
      await sharp(frameBuffers.at(-1)!)
        .webp({ quality: 86 })
        .toFile(`${stem}.webp`);
      if (previewOnly) {
        await writeFile(`${stem}-first.png`, frameBuffers[0]);
        await writeFile(`${stem}-last.png`, frameBuffers.at(-1)!);
      } else {
        const hold = media.durationSeconds / media.stepCount;
        const concat = motion.stages
          .map(
            (_, i) =>
              `file '${String(i).padStart(2, "0")}.png'\nduration ${hold}\n`,
          )
          .join("");
        await writeFile(
          join(frames, "frames.txt"),
          `${concat}file '${String(media.stepCount - 1).padStart(2, "0")}.png'\n`,
        );
        const input = [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          join(frames, "frames.txt"),
          "-an",
          "-map_metadata",
          "-1",
          "-threads",
          "2",
        ];
        run("ffmpeg", [
          ...input,
          "-vf",
          `fps=${fps},tpad=stop_mode=clone:stop_duration=1`,
          "-frames:v",
          String(fps * media.durationSeconds),
          "-c:v",
          "libx264",
          "-preset",
          "slow",
          "-crf",
          "26",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          `${stem}.mp4`,
        ]);
        run("ffmpeg", [
          ...input,
          "-vf",
          `fps=${fps},tpad=stop_mode=clone:stop_duration=1`,
          "-frames:v",
          String(fps * media.durationSeconds),
          "-c:v",
          "libvpx-vp9",
          "-b:v",
          "0",
          "-crf",
          "34",
          "-row-mt",
          "1",
          "-cpu-used",
          "4",
          "-pix_fmt",
          "yuv420p",
          `${stem}.webm`,
        ]);
        run("ffmpeg", [
          ...input,
          "-filter_complex",
          "[0:v]fps=10,scale=960:-1:flags=lanczos,tpad=stop_mode=clone:stop_duration=1,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
          "-frames:v",
          String(10 * media.durationSeconds),
          "-loop",
          "0",
          "-r",
          "10",
          `${stem}.gif`,
        ]);
      }
      const files = await Promise.all(
        (previewOnly ? ["webp"] : ["mp4", "webm", "gif", "webp"]).map(
          async (format) => {
            const path = `${stem}.${format}`;
            const base = {
              format,
              path: relative(root, path),
              bytes: (await stat(path)).size,
            };
            if (!["mp4", "webm", "gif"].includes(format))
              return {
                ...base,
                finalFrameMeanAbsoluteError: await frameError(
                  path,
                  frameBuffers.at(-1)!,
                ),
              };
            const metadata = probe(path);
            const stream = metadata.streams[0];
            const expectedWidth = format === "gif" ? 960 : width;
            const expectedHeight = format === "gif" ? 648 : height;
            const expectedFrames =
              (format === "gif" ? 10 : fps) * media.durationSeconds;
            if (
              Math.abs(
                Number(metadata.format.duration) - media.durationSeconds,
              ) > 0.01 ||
              stream.width !== expectedWidth ||
              stream.height !== expectedHeight ||
              Number(stream.nb_read_frames) !== expectedFrames
            )
              throw new Error(
                `Incorrect encoded duration or dimensions: ${path}`,
              );
            const errors: Record<string, number> = {};
            for (const [position, index, expected] of [
              ["first", 0, frameBuffers[0]],
              ["last", expectedFrames - 1, frameBuffers.at(-1)!],
            ] as const) {
              const actual = join(frames, `${format}-${position}.png`);
              run("ffmpeg", [
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                path,
                "-vf",
                `select=eq(n\\,${index})`,
                "-frames:v",
                "1",
                actual,
              ]);
              errors[position] = await frameError(actual, expected);
              if (errors[position] > 8)
                throw new Error(
                  `Encoded ${position} frame mismatches the native stage: ${path}`,
                );
            }
            return {
              ...base,
              probe: metadata,
              decodedFrameMeanAbsoluteError: errors,
            };
          },
        ),
      );
      receipt.entries.push({
        figure,
        locale,
        nativeSource: relative(root, sourcePath),
        nativeSourceMtime: (await stat(sourcePath)).mtime.toISOString(),
        nativeRevision: config.native_contract.scene_revision,
        readingDirection: motion.reading_direction,
        durationSeconds: media.durationSeconds,
        stageHoldSeconds: media.durationSeconds / media.stepCount,
        steps: motion.stages.map((stage, i) => ({
          index: i + 1,
          name: stage.name,
          bounds_mm: stage.bounds_mm,
          ...(stage.detail_bounds_mm
            ? { detail_bounds_mm: stage.detail_bounds_mm }
            : {}),
        })),
        navigationLabels: labels,
        posterStage: media.stepCount,
        files,
      });
      console.log(
        `${figure}/${locale}: ${files.map((file) => `${file.format} ${(file.bytes / 1_000_000).toFixed(2)} MB`).join(", ")}`,
      );
    }
  }
  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
