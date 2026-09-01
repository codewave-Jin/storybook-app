/**
 * Reset all user-created content while keeping accounts and catalog data.
 *
 * Deletes: characters, storybook orders, sticker orders, reviews, token history.
 * Resets: token balances to 0 (daily free tokens re-granted on next dashboard visit).
 * Keeps: users, templates, art styles, sticker catalog, admin/demo seed accounts.
 *
 * Usage:
 *   npx tsx scripts/reset-user-data.ts              # dry run (counts only)
 *   npx tsx scripts/reset-user-data.ts --confirm    # execute delete
 *
 * Requires DATABASE_URL and DIRECT_URL (e.g. from Vercel or .env.local).
 */
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function loadEnvFiles() {
  for (const name of [".env", ".env.local"]) {
    const filePath = path.join(process.cwd(), name);
    try {
      const text = readFileSync(filePath, "utf8");
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      // optional
    }
  }
}

async function countSnapshot() {
  const [
    users,
    characters,
    storybookOrders,
    illustrations,
    photoAlbumPages,
    stickerOrders,
    reviews,
    reviewImages,
    orderStatusLogs,
    tokenTransactions,
    tokenBalances,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.character.count(),
    prisma.storybookOrder.count(),
    prisma.illustration.count(),
    prisma.photoAlbumPage.count(),
    prisma.stickerOrder.count(),
    prisma.review.count(),
    prisma.reviewImage.count(),
    prisma.orderStatusLog.count(),
    prisma.tokenTransaction.count(),
    prisma.tokenBalance.count(),
  ]);

  return {
    users,
    characters,
    storybookOrders,
    illustrations,
    photoAlbumPages,
    stickerOrders,
    reviews,
    reviewImages,
    orderStatusLogs,
    tokenTransactions,
    tokenBalances,
  };
}

async function resetUserData() {
  const reviewImages = await prisma.reviewImage.deleteMany();
  const reviews = await prisma.review.deleteMany();
  const orderStatusLogs = await prisma.orderStatusLog.deleteMany();
  const illustrations = await prisma.illustration.deleteMany();
  const photoAlbumPages = await prisma.photoAlbumPage.deleteMany();
  const storybookOrders = await prisma.storybookOrder.deleteMany();
  const stickerOrders = await prisma.stickerOrder.deleteMany();
  const characters = await prisma.character.deleteMany();
  const tokenTransactions = await prisma.tokenTransaction.deleteMany();
  const tokenBalances = await prisma.tokenBalance.updateMany({
    data: {
      freeBalance: 0,
      paidBalance: 0,
      lastFreeGrantDate: null,
    },
  });

  return {
    reviewImages,
    reviews,
    orderStatusLogs,
    illustrations,
    photoAlbumPages,
    storybookOrders,
    stickerOrders,
    characters,
    tokenTransactions,
    tokenBalances,
  };
}

async function main() {
  loadEnvFiles();

  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Pull Vercel env or create .env.local first.",
    );
    process.exit(1);
  }

  const confirm = process.argv.includes("--confirm");
  const before = await countSnapshot();

  console.log("=== Current data ===");
  console.log(JSON.stringify(before, null, 2));
  console.log("");
  console.log("Keeps: User accounts, templates, art styles, sticker catalog");
  console.log(
    "Deletes: characters, orders, illustrations, stickers, reviews, token logs",
  );
  console.log("Resets: all token balances to 0");
  console.log(
    "Note: uploaded images in Vercel Blob are NOT deleted by this script.",
  );

  if (!confirm) {
    console.log("");
    console.log("Dry run only. To execute, run:");
    console.log("  npx tsx scripts/reset-user-data.ts --confirm");
    return;
  }

  console.log("");
  console.log("Deleting...");

  const deleted = await resetUserData();
  const after = await countSnapshot();

  console.log("=== Deleted ===");
  console.log(JSON.stringify(deleted, null, 2));
  console.log("");
  console.log("=== After reset ===");
  console.log(JSON.stringify(after, null, 2));
  console.log("");
  console.log("Done. Users can log in again; daily free tokens apply on dashboard visit.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
