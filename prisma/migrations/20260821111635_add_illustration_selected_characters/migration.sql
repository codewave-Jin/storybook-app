-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Illustration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "selectedCharacterIds" JSONB NOT NULL DEFAULT [],
    "imagePath" TEXT,
    "upscaledImagePath" TEXT,
    "seed" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Illustration_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StorybookOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Illustration" ("createdAt", "id", "imagePath", "orderId", "pageNumber", "prompt", "seed", "upscaledImagePath") SELECT "createdAt", "id", "imagePath", "orderId", "pageNumber", "prompt", "seed", "upscaledImagePath" FROM "Illustration";
DROP TABLE "Illustration";
ALTER TABLE "new_Illustration" RENAME TO "Illustration";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
