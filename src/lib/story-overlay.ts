import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { createElement } from "react";
import satori from "satori";
import sharp from "sharp";
import { buildOrderPromptVariables } from "@/lib/illustration-prompt";
import { loadImageAsset } from "@/lib/openai-illustration";
import { parseIdList, parseStringRecord } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { resolveStoryCopyLines } from "@/lib/storybook-copy";
import { isBirthdayStorybookTitle } from "@/lib/templates";
import { persistGeneratedIllustrationBuffer } from "@/lib/uploads";
import {
  ILLUSTRATION_OUTPUT_FORMAT,
  mimeForOutputFormat,
  PAGE_ILLUSTRATION_SIZE,
} from "@/lib/image-generation-config";

const [PAGE_WIDTH, PAGE_HEIGHT] = PAGE_ILLUSTRATION_SIZE.split("x").map(Number);

function storyFontPath() {
  return path.join(process.cwd(), "public", "fonts", "Jua-Regular.ttf");
}

export async function storyLinesForOrderPage(options: {
  orderId: string;
  pageNumber: number;
  pageType?: string | null;
}): Promise<string[]> {
  const order = await prisma.storybookOrder.findUnique({
    where: { id: options.orderId },
    select: {
      heroAgeRange: true,
      selectedCharacterIds: true,
      customInputValues: true,
      template: { select: { title: true } },
    },
  });
  if (!order || !isBirthdayStorybookTitle(order.template.title)) {
    return [];
  }

  const characterIds = parseIdList(order.selectedCharacterIds);
  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
    select: { id: true, label: true },
  });
  const labels = characterIds
    .map((id) => characters.find((character) => character.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const variables = buildOrderPromptVariables({
    characterLabels: labels,
    customInputValues: parseStringRecord(order.customInputValues),
  });

  return resolveStoryCopyLines({
    pageNumber: options.pageNumber,
    pageType: options.pageType,
    ageKey: order.heroAgeRange,
    hasExtra: labels.length > 1,
    variables,
  });
}

async function loadStoryFont() {
  const fontFile = storyFontPath();
  if (!existsSync(fontFile)) {
    throw new Error(`Story font missing: ${fontFile}`);
  }
  return readFile(fontFile);
}

function storyBandHeight(lineCount: number) {
  const fontSize = lineCount >= 8 ? 34 : lineCount >= 6 ? 40 : 46;
  const padding = 64;
  return Math.min(360, Math.max(160, padding + lineCount * Math.round(fontSize * 1.3)));
}

export async function compositeStoryTextOnScene(options: {
  sceneBuffer: Buffer;
  lines: string[];
}): Promise<Buffer> {
  if (options.lines.length === 0) {
    return options.sceneBuffer;
  }

  const fontSize = options.lines.length >= 8 ? 34 : options.lines.length >= 6 ? 40 : 46;
  const bandHeight = storyBandHeight(options.lines.length);
  const svg = await satori(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff8ee",
        },
      },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "90%",
          },
        },
        ...options.lines.map((line) =>
          createElement(
            "div",
            {
              style: {
                color: "#3f2a1a",
                fontSize,
                lineHeight: 1.3,
                fontFamily: "Jua",
                textAlign: "center",
              },
            },
            line,
          ),
        ),
      ),
    ),
    {
      width: PAGE_WIDTH,
      height: bandHeight,
      fonts: [{ name: "Jua", data: await loadStoryFont(), weight: 400, style: "normal" }],
    },
  );
  const caption = await sharp(Buffer.from(svg))
    .resize(PAGE_WIDTH, bandHeight, { fit: "fill" })
    .png()
    .toBuffer();
  const scene = await sharp(options.sceneBuffer)
    .resize(PAGE_WIDTH, PAGE_HEIGHT, { fit: "fill" })
    .jpeg({ quality: 90 })
    .toBuffer();

  return sharp({
    create: {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT + bandHeight,
      channels: 3,
      background: "#fff8ee",
    },
  })
    .composite([
      { input: scene, top: 0, left: 0 },
      { input: caption, top: PAGE_HEIGHT, left: 0 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function applyStoryOverlayToScene(options: {
  orderId: string;
  pageNumber: number;
  pageType?: string | null;
  scenePath: string;
  sceneBuffer?: Buffer;
  keepScenePath?: string | null;
}): Promise<{ imagePath: string; sceneImagePath: string }> {
  const sceneImagePath = options.keepScenePath?.trim() || options.scenePath;
  const lines = await storyLinesForOrderPage({
    orderId: options.orderId,
    pageNumber: options.pageNumber,
    pageType: options.pageType,
  });
  if (lines.length === 0) {
    return {
      imagePath: options.scenePath,
      sceneImagePath,
    };
  }

  const sceneBuffer =
    options.sceneBuffer ??
    (await loadImageAsset(options.scenePath)).bytes;
  const captioned = await compositeStoryTextOnScene({
    sceneBuffer,
    lines,
  });
  const imagePath = await persistGeneratedIllustrationBuffer(
    captioned,
    mimeForOutputFormat(ILLUSTRATION_OUTPUT_FORMAT),
  );

  return {
    imagePath,
    sceneImagePath,
  };
}
