/*
  Warnings:

  - Added the required column `static` to the `Element` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnail` to the `Map` table without a default value. This is not possible if the table is not empty.
  - Made the column `height` on table `Space` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Element" ADD COLUMN     "static" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "Map" ADD COLUMN     "thumbnail" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Space" ALTER COLUMN "height" SET NOT NULL;
