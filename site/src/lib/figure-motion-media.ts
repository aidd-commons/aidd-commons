/** Manual figure downloads. Players must not fetch these files before a request. */
export type FigureMotionId = "decision-pipeline" | "frozen-lifecycle";
export type FigureMotionLocale = "en" | "zh-cn";

export interface FigureMotionMedia {
  durationSeconds: 27 | 15;
  stepCount: 9 | 5;
  poster: string;
  mp4: string;
  webm: string;
  gif: string;
}

export const figureMotionMedia = (
  figure: FigureMotionId,
  locale: FigureMotionLocale,
): FigureMotionMedia => {
  const stem = `/media/figures/${figure}-${locale}`;
  return {
    durationSeconds: figure === "decision-pipeline" ? 27 : 15,
    stepCount: figure === "decision-pipeline" ? 9 : 5,
    poster: `${stem}.webp`,
    mp4: `${stem}.mp4`,
    webm: `${stem}.webm`,
    gif: `${stem}.gif`,
  };
};
