/** Curated delivery media. Downloads are never fetched by the animation player. */
export type StoryId = "evidence" | "identity" | "dmta";
export type StoryLocale = "en" | "zh-cn";
export interface StoryMedia {
  durationSeconds: 10;
  poster: string;
  mp4: string;
  webm: string;
  gif: string;
}
export const storyMedia = (story: StoryId, locale: StoryLocale): StoryMedia => {
  const stem = `/media/stories/${story}-${locale}`;
  return {
    durationSeconds: 10,
    poster: `${stem}.webp`,
    mp4: `${stem}.mp4`,
    webm: `${stem}.webm`,
    gif: `${stem}.gif`,
  };
};
