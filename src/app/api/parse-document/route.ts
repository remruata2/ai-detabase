import { NextRequest, NextResponse } from "next/server";
import { LlamaParseDocumentParser } from "@/lib/llamaparse-document-parser";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  console.log("[PARSE-DOCUMENT] API called");

  let tempFilePath: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Create a temporary file path
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `upload_${Date.now()}_${file.name}`);

    // Save the uploaded file to the temporary path
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, fileBuffer);
    console.log(`[PARSE-DOCUMENT] File saved temporarily to ${tempFilePath}`);

    // Initialize and use the LlamaParse parser
    const parser = new LlamaParseDocumentParser();
    const content = await parser.parseFile(tempFilePath);

    console.log("[PARSE-DOCUMENT] Document parsed successfully with LlamaParse");

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("[PARSE-DOCUMENT] Error:", error);
    console.error(
      "[PARSE-DOCUMENT] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    // Clean up the temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`[PARSE-DOCUMENT] Deleted temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(`[PARSE-DOCUMENT] Error deleting temporary file ${tempFilePath}:`, cleanupError);
      }
    }
  }
}
