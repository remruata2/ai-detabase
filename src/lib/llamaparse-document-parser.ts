import { LlamaParseReader } from "llamaindex";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export class LlamaParseDocumentParser {
  private reader: LlamaParseReader;

  constructor() {
    const apiKey = process.env.LLAMAPARSE_API_KEY;
    if (!apiKey) {
      throw new Error("LLAMAPARSE_API_KEY is not set in the environment variables.");
    }

    this.reader = new LlamaParseReader({
      apiKey: apiKey,
      resultType: "markdown", // We want the output in Markdown format
    });
  }

  /**
   * Parses a document from a file path using LlamaParse.
   * @param filePath The path to the file to parse.
   * @returns A promise that resolves to the parsed content in Markdown.
   */
  public async parseFile(filePath: string): Promise<string> {
    try {
      console.log(`[LlamaParse] Parsing file: ${filePath}`);
      const documents = await this.reader.loadData(filePath);

      if (!documents || documents.length === 0) {
        throw new Error("LlamaParse returned no documents.");
      }

      // Combine the text content from all resulting documents
      const content = documents.map((doc) => doc.text).join("\n\n");
      console.log("[LlamaParse] Successfully parsed document.");
      return content;
    } catch (error) {
      console.error("Error parsing with LlamaParse:", error);
      throw error;
    }
  }
}
