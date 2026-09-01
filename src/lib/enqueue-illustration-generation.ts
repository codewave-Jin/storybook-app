import { waitUntil } from "@vercel/functions";
import { runIllustrationGeneration } from "@/lib/illustration-generate";
import { shouldGenerateIllustration } from "@/lib/illustration-generation-policy";
import { parseIdList } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

/**
 * Kick illustration generation in-process via waitUntil.
 * Avoids fragile HTTP self-fetch (base URL / INTERNAL_API_KEY / 308 redirect),
 * which left pages stuck in IDLE forever when the enqueue request failed.
 */
export function enqueueIllustrationGenerations(illustrationIds: string[]) {
  if (illustrationIds.length === 0) {
    return Promise.resolve();
  }

  const dispatched = (async () => {
    const pages = await prisma.illustration.findMany({
      where: { id: { in: illustrationIds } },
      select: {
        id: true,
        prompt: true,
        selectedCharacterIds: true,
        status: true,
        updatedAt: true,
      },
    });

    const targets = pages.filter((page) => shouldGenerateIllustration(page));
    console.log(
      "[storybook-generation] direct generate start",
      targets.map((page) => page.id),
    );

    // Sequential: more reliable under Vercel time limits than 3 parallel OpenAI calls.
    for (const page of targets) {
      const characterIds = parseIdList(page.selectedCharacterIds);
      if (!page.prompt.trim() || characterIds.length < 1) {
        console.error(
          "[storybook-generation] skip generate (missing prompt/characters)",
          page.id,
        );
        continue;
      }

      try {
        const result = await runIllustrationGeneration({
          illustrationId: page.id,
          prompt: page.prompt,
          characterIds,
        });
        if (result.error) {
          console.error(
            "[storybook-generation] generate failed",
            page.id,
            result.error,
          );
        } else {
          console.log("[storybook-generation] generate ok", page.id);
        }
      } catch (error) {
        console.error(
          "[storybook-generation] generate threw",
          page.id,
          error,
        );
      }
    }
  })();

  waitUntil(dispatched);
  // Generation runs in the background; do not return a promise callers can await.
}
