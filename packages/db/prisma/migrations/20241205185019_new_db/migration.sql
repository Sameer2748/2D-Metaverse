/*
  Warnings:

  - Added the required column `static` to the `MapElements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `static` to the `spaceElements` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MapElements" ADD COLUMN     "static" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "spaceElements" ADD COLUMN     "static" BOOLEAN NOT NULL;
