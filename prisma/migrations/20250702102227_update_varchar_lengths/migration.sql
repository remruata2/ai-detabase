/*
  Warnings:

  - You are about to alter the column `category` on the `file_list` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(150)`.
  - You are about to alter the column `title` on the `file_list` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(255)`.
  - You are about to alter the column `doc1` on the `file_list` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(150)`.

*/
-- AlterTable
ALTER TABLE "file_list" ADD COLUMN     "updated_at" TIMESTAMPTZ(6),
ALTER COLUMN "category" SET DATA TYPE VARCHAR(150),
ALTER COLUMN "title" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "doc1" SET DATA TYPE VARCHAR(150);
