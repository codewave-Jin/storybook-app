/**
 * Landing media slots. Replace `null` with a public path
 * (e.g. "/landing/home/child-before.jpg") when real assets are ready.
 */
export type HomeMediaPair = {
  id: string;
  caption: string;
  before: string | null;
  after: string | null;
  beforeLabel?: string;
  afterLabel?: string;
};

export const HOME_MEDIA = {
  heroPairs: [
    {
      id: "child",
      caption: "아이",
      before: "/landing/child-before.png",
      after: "/landing/child-after.png",
    },
    {
      id: "mom",
      caption: "엄마",
      before: "/landing/mom-before.jpg",
      after: "/landing/mom-after.png",
    },
    {
      id: "dad",
      caption: "아빠",
      before: "/landing/dad-before.jpg",
      after: "/landing/dad-after.png",
    },
    {
      id: "sticker",
      caption: "스티커",
      before: "/landing/base.png",
      after: "/landing/birthday.png",
      beforeLabel: "캐릭터",
      afterLabel: "스티커",
    },
    {
      id: "emote",
      caption: "이모티콘",
      before: "/landing/basebook.png",
      after: "/landing/base-emote.png",
      beforeLabel: "동화책",
      afterLabel: "이모티콘",
    },
  ] satisfies HomeMediaPair[],
  whyPhoto: "/landing/child-before.png" as string | null,
  whyCharacter: "/landing/child-after.png" as string | null,
};

export function characterStartHref() {
  return "/dashboard";
}

export function storybookStartHref() {
  return "/dashboard";
}
