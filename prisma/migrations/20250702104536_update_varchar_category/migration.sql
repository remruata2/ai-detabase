/*
  Warnings:

  - You are about to alter the column `category` on the `category_list` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "category_list" ALTER COLUMN "category" SET DATA TYPE VARCHAR(255);
