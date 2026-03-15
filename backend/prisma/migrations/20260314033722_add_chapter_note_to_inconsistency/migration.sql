-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Inconsistency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "noteId" INTEGER NOT NULL,
    "chapterNoteId" INTEGER,
    "description" TEXT NOT NULL,
    "offendingText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inconsistency_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inconsistency_chapterNoteId_fkey" FOREIGN KEY ("chapterNoteId") REFERENCES "Note" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Inconsistency" ("createdAt", "description", "id", "noteId", "offendingText", "status", "updatedAt") SELECT "createdAt", "description", "id", "noteId", "offendingText", "status", "updatedAt" FROM "Inconsistency";
DROP TABLE "Inconsistency";
ALTER TABLE "new_Inconsistency" RENAME TO "Inconsistency";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
