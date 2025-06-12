-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'staff');

-- CreateTable
CREATE TABLE "_category_list" (
    "id" SMALLINT,
    "file_no" VARCHAR(23),
    "category" VARCHAR(113)
);

-- CreateTable
CREATE TABLE "_file_list" (
    "id" SMALLINT,
    "file_no" VARCHAR(16),
    "category" VARCHAR(25),
    "title" VARCHAR(74),
    "note" VARCHAR(81982),
    "doc1" VARCHAR(1),
    "doc2" VARCHAR(1),
    "doc3" VARCHAR(1),
    "doc4" VARCHAR(1),
    "doc5" VARCHAR(1),
    "doc6" VARCHAR(1),
    "entry_date" VARCHAR(10),
    "entry_date_real" VARCHAR(10)
);

-- CreateTable
CREATE TABLE "_setting" (
    "id" SMALLINT,
    "category" VARCHAR(12)
);

-- CreateTable
CREATE TABLE "_user_list" (
    "id" SMALLINT,
    "user" VARCHAR(5),
    "password" VARCHAR(32)
);

-- CreateTable
CREATE TABLE "category_list" (
    "id" SERIAL NOT NULL,
    "file_no" VARCHAR(100) NOT NULL,
    "category" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_list" (
    "id" SERIAL NOT NULL,
    "file_no" VARCHAR(100) NOT NULL,
    "category" VARCHAR(500) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "note" TEXT,
    "doc1" VARCHAR(255),
    "doc2" VARCHAR(255),
    "doc3" VARCHAR(255),
    "doc4" VARCHAR(255),
    "doc5" VARCHAR(255),
    "doc6" VARCHAR(255),
    "entry_date" VARCHAR(50),
    "entry_date_real" DATE,
    "search_vector" tsvector,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "note_plain_text" TEXT,

    CONSTRAINT "file_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'staff',
    "is_active" BOOLEAN DEFAULT true,
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_category_file_no" ON "category_list"("file_no");

-- CreateIndex
CREATE INDEX "idx_file_list_category" ON "file_list"("category");

-- CreateIndex
CREATE INDEX "idx_file_list_entry_date" ON "file_list"("entry_date_real");

-- CreateIndex
CREATE INDEX "idx_file_list_file_no" ON "file_list"("file_no");

-- CreateIndex
CREATE INDEX "idx_search_vector" ON "file_list" USING GIN ("search_vector");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");
