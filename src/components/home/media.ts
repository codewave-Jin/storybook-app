/**
 * Landing media slots. Replace `null` with a public path
 * (e.g. "/landing/home/child-before.jpg") when real assets are ready.
 */
export type HomeMediaPair = {
  id: string;
  caption: string;
  before: string | null;
  after: string | null;
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
  ] satisfies HomeMediaPair[],
  whyPhoto: "/landing/child-before.png" as string | null,
  whyCharacter: "/landing/child-after.png" as string | null,
};

export function characterStartHref(_isLoggedIn: boolean) {
  return "/dashboard";
}

export function storybookStartHref(isLoggedIn: boolean) {
  return isLoggedIn
    ? "/dashboard/order/new"
    : "/login?callbackUrl=/dashboard/order/new";
}
