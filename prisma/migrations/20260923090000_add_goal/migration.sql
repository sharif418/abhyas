
-- লক্ষ্য (Target/Goal) — measurable targets with milestones & deadlines.
-- NOTE: this table shipped in code (c6e3545) without a migration, which broke
-- /api/goals on production (500). This migration repairs that.
-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'ব্যক্তিগত',
    "icon" TEXT NOT NULL DEFAULT 'Target',
    "color" TEXT NOT NULL DEFAULT '#059669',
    "unit" TEXT NOT NULL DEFAULT 'ধাপ',
    "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_userId_active_idx" ON "Goal"("userId", "active");
CREATE INDEX "Goal_userId_category_idx" ON "Goal"("userId", "category");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
