CREATE TABLE IF NOT EXISTS "file_list" (
      "id" SERIAL PRIMARY KEY,
      
  "id" integer NOT NULL,
  "file_no" varchar(50) NOT NULL,
  "category" varchar(220) NOT NULL,
  "title" varchar(220) NOT NULL,
  "note" text NOT NULL,
  "doc1" varchar(150) NOT NULL,
  "doc2" varchar(150) NOT NULL,
  "doc3" varchar(150) NOT NULL,
  "doc4" varchar(150) NOT NULL,
  "doc5" varchar(150) NOT NULL,
  "doc6" varchar(150) NOT NULL,
  "entry_date" varchar(25) NOT NULL,
  "entry_date_real" date NOT NULL,
  "note_plain_text" text NOT NULL

    );

    INSERT INTO "file_list" ("file_no", "category", "title", "note", "doc1", "doc2", "doc3", "doc4", "doc5", "doc6", "entry_date", "entry_date_real", "note_plain_text") VALUES
;