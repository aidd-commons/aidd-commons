/** Reproduce the web scenes as localized movies. Requires site sharp + ffmpeg.
 * From root: node node_modules/tsx/dist/cli.mjs site/scripts/export-science-stories.ts
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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderStoryFrame, scienceStory } from "../src/lib/science-stories.js";
import type { StoryId, StoryLocale } from "../src/lib/story-media.js";
const site = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const destination = resolve(
  arg("--destination") ?? join(site, "public/media/stories"),
);
const receiptPath = resolve(
  arg("--receipt") ??
    join(site, "../tmp/science-stories-20261106/export-receipt.json"),
);
const stories = (
  arg("--story") ? [arg("--story")] : ["evidence", "identity", "dmta"]
) as StoryId[];
const locales = (
  arg("--locale") ? [arg("--locale")] : ["en", "zh-cn"]
) as StoryLocale[];
if (
  stories.some((id) => !["evidence", "identity", "dmta"].includes(id)) ||
  locales.some((id) => !["en", "zh-cn"].includes(id))
)
  throw new Error("Unknown story or locale");
const fps = 15,
  seconds = 10;
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
function run(command: string, args: string[]) {
  const r = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 2_000_000,
  });
  if (r.status !== 0)
    throw new Error(`${command}: ${r.stderr ?? r.error?.message}`);
  return r.stdout.trim();
}
function wrap(value: string, max: number) {
  if (/\p{Script=Han}/u.test(value))
    return value.match(new RegExp(`.{1,${Math.floor(max / 1.8)}}`, "gu")) ?? [];
  const lines: string[] = [];
  for (const word of value.split(" ")) {
    const i = lines.length - 1;
    if (i >= 0 && lines[i].length + word.length < max) lines[i] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}
const art = await sharp(
  await readFile(join(site, "src/assets/editorial/evidence-journey-v2.png")),
)
  .resize(960)
  .png()
  .toBuffer();
const artHref = `data:image/png;base64,${art.toString("base64")}`;
function fullFrame(story: StoryId, locale: StoryLocale, p: number) {
  const definition = scienceStory(story, locale);
  const index = Math.min(
    definition.steps.length - 1,
    Math.floor(p * definition.steps.length),
  );
  const step = definition.steps[index];
  const content = renderStoryFrame(
    story,
    p,
    locale,
    false,
    story === "evidence" ? artHref : "",
  );
  const scene = content
    .replace(/^<svg[^>]*>/u, '<g transform="translate(0 55)">')
    .replace(/<\/svg>$/u, "</g>");
  const label =
    locale === "zh-cn"
      ? "概念演示 · 并非实验观测"
      : "CONCEPTUAL EXAMPLE · NOT EXPERIMENTAL OBSERVATIONS";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#fffaf2"/><g font-family="Arial,'PingFang SC','Noto Sans CJK SC',sans-serif" fill="#183248"><text x="30" y="33" font-size="16" fill="#61737d">${escape(label)}</text>${scene}<path d="M30 491 H930" stroke="#bccdcd"/><text x="30" y="530" font-size="25" font-weight="700">${String(index + 1).padStart(2, "0")} / ${definition.steps.length} · ${escape(step.title)}</text>${wrap(
    step.detail,
    102,
  )
    .map(
      (line, i) =>
        `<text x="30" y="${565 + i * 28}" font-size="19" fill="#61737d">${escape(line)}</text>`,
    )
    .join(
      "",
    )}<rect x="30" y="620" width="900" height="3" fill="#d8e3df"/><rect x="30" y="620" width="${Math.round(p * 900)}" height="3" fill="#087e84"/></g></svg>`;
}
await mkdir(destination, { recursive: true });
const scratch = await mkdtemp(join(tmpdir(), "aidd-story-frames-"));
const receipt = {
  generatedAt: new Date().toISOString(),
  tool: run("ffmpeg", ["-version"]).split("\n")[0],
  frameRate: fps,
  seconds,
  sharedSource: "site/src/lib/science-stories.ts",
  entries: [] as unknown[],
};
try {
  for (const story of stories)
    for (const locale of locales) {
      const frames = join(scratch, `${story}-${locale}`);
      await mkdir(frames);
      for (let i = 0; i < fps * seconds; i++)
        await sharp(
          Buffer.from(
            fullFrame(story, locale, (i / (fps * seconds - 1)) * 0.999999),
          ),
        )
          .png()
          .toFile(join(frames, `${String(i).padStart(4, "0")}.png`));
      const stem = join(destination, `${story}-${locale}`);
      await sharp(Buffer.from(fullFrame(story, locale, 0.999999)))
        .webp({ quality: 82 })
        .toFile(`${stem}.webp`);
      const input = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-framerate",
        String(fps),
        "-i",
        join(frames, "%04d.png"),
      ];
      run("ffmpeg", [
        ...input,
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "29",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-map_metadata",
        "-1",
        `${stem}.mp4`,
      ]);
      run("ffmpeg", [
        ...input,
        "-an",
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "0",
        "-crf",
        "38",
        "-row-mt",
        "1",
        "-pix_fmt",
        "yuv420p",
        "-map_metadata",
        "-1",
        `${stem}.webm`,
      ]);
      run("ffmpeg", [
        ...input,
        "-filter_complex",
        "[0:v]fps=10,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
        "-loop",
        "0",
        "-map_metadata",
        "-1",
        `${stem}.gif`,
      ]);
      const files = await Promise.all(
        ["mp4", "webm", "gif", "webp"].map(async (format) => ({
          format,
          path: `site/public/media/stories/${story}-${locale}.${format}`,
          bytes: (await stat(`${stem}.${format}`)).size,
        })),
      );
      for (const file of files)
        if (["mp4", "webm"].includes(file.format) && file.bytes > 2_000_000)
          throw new Error(`Video exceeds 2 MB: ${file.path}`);
      const probe = JSON.parse(
        run("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration:stream=codec_name,width,height,nb_frames",
          "-of",
          "json",
          `${stem}.mp4`,
        ]),
      );
      receipt.entries.push({
        story,
        locale,
        sourceFrames: fps * seconds,
        files,
        probe,
      });
      console.log(
        `${story}/${locale}: ${files.map((file) => `${file.format} ${(file.bytes / 1_000_000).toFixed(2)} MB`).join(", ")}`,
      );
    }
  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
