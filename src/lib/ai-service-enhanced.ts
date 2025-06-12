import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: Array<{
    id: number;
    file_no: string;
    title: string;
  }>;
}

export interface SearchResult {
  id: number;
  file_no: string;
  category: string;
  title: string;
  note_plain_text: string | null;
  entry_date_real: Date | null;
  rank?: number; // For relevance ranking
}

/**
 * Analyze user query and extract search keywords using AI
 */
export async function analyzeQueryForSearch(
  currentQuery: string,
  conversationHistory: ChatMessage[] = []
): Promise<{
  searchKeywords: string;
  queryType:
    | "specific_search"
    | "follow_up"
    | "elaboration"
    | "general"
    | "recent_files";
  contextNeeded: boolean;
}> {
  try {
    // First check if this is a recent/latest files query
    const recentFilesPattern =
      /\b(recent|latest|newest|last|most recent)\s+(files?|records?|cases?|entries?)\b/i;
    const numberPattern =
      /\b(\d+)\s+(recent|latest|newest|last|most recent)\s+(files?|records?|cases?|entries?)\b/i;

    if (
      recentFilesPattern.test(currentQuery) ||
      numberPattern.test(currentQuery)
    ) {
      console.log("[QUERY ANALYSIS] Detected recent files query");
      return {
        searchKeywords: currentQuery, // Keep original for context
        queryType: "recent_files",
        contextNeeded: false,
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build conversation context
    const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
    const historyContext =
      recentHistory.length > 0
        ? `\nRECENT CONVERSATION:\n${recentHistory
            .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join("\n")}\n`
        : "";

    const prompt = `You are an AI assistant analyzing queries for a CID (Criminal Investigation Department) database search system.

${historyContext}

CURRENT USER QUERY: "${currentQuery}"

Your task is to:
1. Determine the query type
2. Extract the best search keywords for database search
3. Decide if conversation context is needed

Query Types:
- specific_search: Direct questions about cases, people, dates, etc.
- follow_up: Questions referring to previous results ("Who caught her?", "What happened next?")
- elaboration: Requests for more details ("Elaborate", "Tell me more", "Explain further")
- general: General questions or greetings
- recent_files: Queries asking for recent/latest/newest files (handled separately)

IMPORTANT: If the query asks for "recent", "latest", "newest", or "most recent" files/records/cases, classify it as "recent_files".

For follow_up and elaboration queries, you MUST extract keywords from the conversation history.

Respond in this exact JSON format:
{
  "searchKeywords": "extracted keywords for database search",
  "queryType": "one of the five types above",
  "contextNeeded": true/false
}

Examples:
- "Cases from 2007?" → {"searchKeywords": "cases 2007", "queryType": "specific_search", "contextNeeded": false}
- "Who caught her?" → {"searchKeywords": "caught arrest suspect", "queryType": "follow_up", "contextNeeded": true}
- "Show me the most recent 3 files" → {"searchKeywords": "recent files", "queryType": "recent_files", "contextNeeded": false}
- "Latest cases" → {"searchKeywords": "latest cases", "queryType": "recent_files", "contextNeeded": false}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Validate response
    if (!analysis.searchKeywords || !analysis.queryType) {
      throw new Error("Incomplete analysis from AI");
    }

    return {
      searchKeywords: analysis.searchKeywords,
      queryType: analysis.queryType,
      contextNeeded: analysis.contextNeeded || false,
    };
  } catch (error) {
    console.error("Query analysis error:", error);

    // Fallback to simple keyword extraction
    const fallbackKeywords = currentQuery
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(" ")
      .filter((word) => word.length > 2)
      .join(" ");

    return {
      searchKeywords: fallbackKeywords || currentQuery,
      queryType: "specific_search",
      contextNeeded: false,
    };
  }
}

/**
 * Get recent files sorted by date
 */
export async function getRecentFiles(
  limit: number = 10
): Promise<SearchResult[]> {
  try {
    console.log(`[RECENT FILES] Fetching ${limit} most recent files`);

    const records = await prisma.fileList.findMany({
      select: {
        id: true,
        file_no: true,
        category: true,
        title: true,
        note_plain_text: true,
        entry_date_real: true,
      },
      where: {
        entry_date_real: {
          not: null,
        },
      },
      orderBy: {
        entry_date_real: "desc",
      },
      take: limit,
    });

    console.log(`[RECENT FILES] Found ${records.length} recent files`);

    return records.map((record) => ({
      ...record,
      rank: 1.0, // All recent files have equal relevance
    }));
  } catch (error) {
    console.error("Recent files query error:", error);
    throw new Error("Failed to fetch recent files");
  }
}

/**
 * Enhanced database search using PostgreSQL tsvector for better performance and relevance
 */
export async function searchDatabaseEnhanced(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  try {
    // Clean and prepare the search query
    const cleanQuery = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove special characters
      .split(" ")
      .filter((term) => term.length > 2)
      .join(" | "); // Use | for OR logic in tsquery (more flexible)

    if (!cleanQuery) {
      return [];
    }

    console.log(
      `[ENHANCED SEARCH] Query: "${query}" -> TSQuery: "${cleanQuery}"`
    );

    // Use raw SQL for tsvector search with ranking
    // Try both the complex query and individual terms
    const simpleQuery = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(" ")
      .filter((term) => term.length > 2)
      .join(" "); // Simple space-separated for plainto_tsquery

    // For better precision, use AND logic for tsvector search and higher ranking threshold
    const records = (await prisma.$queryRawUnsafe(
      `
      SELECT 
        id,
        file_no,
        category,
        title,
        note_plain_text,
        entry_date_real,
        GREATEST(
          COALESCE(ts_rank(search_vector, plainto_tsquery('english', $1)), 0),
          COALESCE(ts_rank(search_vector, plainto_tsquery('english', $2)), 0)
        ) as rank
      FROM file_list 
      WHERE (
        search_vector @@ plainto_tsquery('english', $1)
        OR search_vector @@ plainto_tsquery('english', $2)
      )
      AND GREATEST(
        COALESCE(ts_rank(search_vector, plainto_tsquery('english', $1)), 0),
        COALESCE(ts_rank(search_vector, plainto_tsquery('english', $2)), 0)
      ) > 0.01
      ORDER BY 
        GREATEST(
          COALESCE(ts_rank(search_vector, plainto_tsquery('english', $1)), 0),
          COALESCE(ts_rank(search_vector, plainto_tsquery('english', $2)), 0)
        ) DESC,
        entry_date_real DESC
      LIMIT $5
    `,
      cleanQuery, // Complex query with | operators
      simpleQuery, // Simple space-separated terms
      limit
    )) as SearchResult[];

    console.log(
      `[ENHANCED SEARCH] Found ${records.length} records with relevance > 0.01`
    );

    // If no high-relevance results, fall back to broader search with ILIKE
    if (records.length === 0) {
      console.log(
        "[ENHANCED SEARCH] No high-relevance results, trying broader search"
      );

      const fallbackRecords = (await prisma.$queryRawUnsafe(
        `
        SELECT 
          id,
          file_no,
          category,
          title,
          note_plain_text,
          entry_date_real,
          0.1 as rank
        FROM file_list 
        WHERE note_plain_text ILIKE ANY($1)
           OR title ILIKE ANY($1)  
           OR category ILIKE ANY($1)
           OR file_no ILIKE ANY($1)
        ORDER BY 
          CASE 
            WHEN note_plain_text ILIKE $2 THEN 3
            WHEN title ILIKE $2 THEN 2
            WHEN file_no ILIKE $2 THEN 1
            ELSE 0
          END DESC,
          entry_date_real DESC
        LIMIT $3
      `,
        query
          .toLowerCase()
          .split(/\s+/)
          .filter((term) => term.length > 2)
          .map((term) => `%${term}%`), // Individual terms for ILIKE
        `%${query.toLowerCase()}%`, // Exact phrase for priority ranking
        limit
      )) as SearchResult[];

      console.log(
        `[ENHANCED SEARCH] Fallback found ${fallbackRecords.length} records`
      );
      return fallbackRecords;
    }

    return records;
  } catch (error) {
    console.error("Enhanced database search error:", error);

    // Fallback to the original search method
    console.log("[ENHANCED SEARCH] Falling back to original search method");
    return searchDatabaseFallback(query, limit);
  }
}

/**
 * Fallback search method (original implementation)
 */
async function searchDatabaseFallback(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  try {
    const searchTerms = query
      .toLowerCase()
      .split(" ")
      .filter((term) => term.length > 2);

    const records = await prisma.fileList.findMany({
      where: {
        OR: [
          ...searchTerms.map((term) => ({
            note_plain_text: { contains: term, mode: "insensitive" as const },
          })),
          ...searchTerms.map((term) => ({
            title: { contains: term, mode: "insensitive" as const },
          })),
          ...searchTerms.map((term) => ({
            category: { contains: term, mode: "insensitive" as const },
          })),
          ...searchTerms.map((term) => ({
            file_no: { contains: term, mode: "insensitive" as const },
          })),
        ],
      },
      select: {
        id: true,
        file_no: true,
        category: true,
        title: true,
        note_plain_text: true,
        entry_date_real: true,
      },
      take: limit,
      orderBy: { entry_date_real: "desc" },
    });

    return records;
  } catch (error) {
    console.error("Fallback database search error:", error);
    throw new Error("Failed to search database");
  }
}

/**
 * Prepare context for AI from database records with relevance scoring
 */
function prepareContextForAI(records: SearchResult[]): string {
  if (records.length === 0) {
    return "No relevant records found in the database.";
  }

  const context = records.map((record, index) => ({
    id: record.id,
    source: `File: ${record.file_no}`,
    title: record.title,
    category: record.category,
    content: record.note_plain_text || "No content available",
    date: record.entry_date_real?.toLocaleDateString() || "Unknown date",
    relevance: record.rank
      ? `(Relevance: ${(record.rank * 100).toFixed(1)}%)`
      : "",
  }));

  return `
DATABASE CONTEXT:
Found ${
    records.length
  } relevant records from the CID database (ordered by relevance):

${context
  .map(
    (record, index) => `
[RECORD ${index + 1}] ${record.relevance}
File: ${record.source}
Title: ${record.title}
Category: ${record.category}
Date: ${record.date}
Content: ${record.content}
---`
  )
  .join("\n")}

END OF DATABASE CONTEXT
`;
}

/**
 * Generate AI response using Gemini with conversation context
 */
export async function generateAIResponse(
  question: string,
  context: string,
  conversationHistory: ChatMessage[] = [],
  queryType: string = "specific_search"
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build conversation context for follow-up questions
    const recentHistory = conversationHistory.slice(-4); // Last 2 exchanges
    const historyContext =
      recentHistory.length > 0
        ? `\nCONVERSATION HISTORY:\n${recentHistory
            .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join("\n")}\n`
        : "";

    // Adjust prompt based on query type
    let roleInstructions = "";
    switch (queryType) {
      case "follow_up":
        roleInstructions = `
- This is a follow-up question referring to previous conversation
- Use both the conversation history and database records to answer
- Connect the current question to previous context
`;
        break;
      case "elaboration":
        roleInstructions = `
- The user wants more detailed information about previous results
- Provide comprehensive details from the database records
- Expand on the information with additional context
`;
        break;
      case "recent_files":
        roleInstructions = `
- The user asked for recent/latest files
- Present the files in a clear, organized manner
- Include file numbers, titles, categories, and dates
- Mention they are sorted by most recent first
`;
        break;
      default:
        roleInstructions = `
- Answer the specific question using the database records
- Be factual and cite relevant information
- Provide clear, organized information
`;
    }

    const prompt = `You are a helpful AI assistant for the CID (Criminal Investigation Department) database system.

${historyContext}

CURRENT QUESTION: "${question}"

${context}

INSTRUCTIONS:
${roleInstructions}

- Always be professional and factual
- If asked about specific cases, provide file numbers and relevant details
- If no relevant information is found, say so clearly
- Keep responses concise but informative
- Use bullet points or numbered lists when presenting multiple items

Please provide a helpful response based on the database records above.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI response generation error:", error);
    throw new Error("Failed to generate AI response");
  }
}

/**
 * Main chat function using enhanced search with conversation context
 */
export async function processChatMessageEnhanced(
  question: string,
  conversationHistory: ChatMessage[] = [],
  searchLimit: number = 8,
  useEnhancedSearch: boolean = true
): Promise<{
  response: string;
  sources: Array<{
    id: number;
    file_no: string;
    title: string;
    relevance?: number;
  }>;
  searchQuery: string;
  searchMethod: "enhanced_tsvector" | "fallback_contains" | "recent_files";
  queryType: string;
  analysisUsed: boolean;
}> {
  try {
    console.log(`[CHAT ANALYSIS] Processing query: "${question}"`);
    console.log(
      `[CHAT ANALYSIS] Conversation history length: ${conversationHistory.length}`
    );

    // Analyze the query to understand intent and extract search keywords
    const queryAnalysis = await analyzeQueryForSearch(
      question,
      conversationHistory
    );

    console.log(`[CHAT ANALYSIS] Query type: ${queryAnalysis.queryType}`);
    console.log(
      `[CHAT ANALYSIS] Search keywords: "${queryAnalysis.searchKeywords}"`
    );
    console.log(
      `[CHAT ANALYSIS] Context needed: ${queryAnalysis.contextNeeded}`
    );

    // Handle recent files queries specially
    if (queryAnalysis.queryType === "recent_files") {
      console.log("[CHAT ANALYSIS] Handling recent files query");

      // Extract number from query if specified
      const numberMatch = question.match(/\b(\d+)\s+/);
      const requestedLimit = numberMatch
        ? parseInt(numberMatch[1])
        : searchLimit;
      const actualLimit = Math.min(requestedLimit, 20); // Cap at 20 for performance

      console.log(
        `[RECENT FILES] Requested: ${requestedLimit}, Using: ${actualLimit}`
      );

      const records = await getRecentFiles(actualLimit);

      if (records.length === 0) {
        return {
          response:
            "I couldn't find any files in the database with valid dates.",
          sources: [],
          searchQuery: question,
          searchMethod: "recent_files",
          queryType: queryAnalysis.queryType,
          analysisUsed: true,
        };
      }

      // Prepare context for AI
      const context = prepareContextForAI(records);

      // Generate AI response
      const aiResponse = await generateAIResponse(
        question,
        context,
        conversationHistory,
        queryAnalysis.queryType
      );

      // Prepare sources for reference
      const sources = records.map((record) => ({
        id: record.id,
        file_no: record.file_no,
        title: record.title,
        relevance: record.rank,
      }));

      console.log(
        `[CHAT ANALYSIS] Generated response with ${sources.length} recent files`
      );

      return {
        response: aiResponse,
        sources,
        searchQuery: question,
        searchMethod: "recent_files",
        queryType: queryAnalysis.queryType,
        analysisUsed: true,
      };
    }

    // Use analyzed keywords for search instead of raw question
    const searchQuery = queryAnalysis.searchKeywords;

    // Handle general queries without database search
    if (
      queryAnalysis.queryType === "general" &&
      !queryAnalysis.searchKeywords.trim()
    ) {
      return {
        response:
          "Hello! I'm your CID database assistant. I can help you search for criminal investigation records, cases, suspects, and other law enforcement data. You can ask me questions like:\n\n• 'Show me cases from 2007'\n• 'Find records about theft cases'\n• 'Search for files containing [specific name]'\n• 'What cases were filed in [location]?'\n• 'Show me the most recent 5 files'\n\nWhat would you like to search for?",
        sources: [],
        searchQuery: question,
        searchMethod: useEnhancedSearch
          ? "enhanced_tsvector"
          : "fallback_contains",
        queryType: queryAnalysis.queryType,
        analysisUsed: true,
      };
    }

    // Search the database for relevant records using analyzed keywords
    const records = useEnhancedSearch
      ? await searchDatabaseEnhanced(searchQuery, searchLimit)
      : await searchDatabaseFallback(searchQuery, searchLimit);

    // Handle elaboration requests when no new records found but context exists
    if (
      records.length === 0 &&
      queryAnalysis.queryType === "elaboration" &&
      conversationHistory.length > 0
    ) {
      // Try to get more details from previous search results
      const lastAssistantMessage = conversationHistory
        .slice()
        .reverse()
        .find(
          (msg) =>
            msg.role === "assistant" && msg.sources && msg.sources.length > 0
        );

      if (lastAssistantMessage && lastAssistantMessage.sources) {
        // Re-fetch the records from previous search for elaboration
        const previousRecordIds = lastAssistantMessage.sources.map((s) => s.id);
        const elaborationRecords = await prisma.fileList.findMany({
          where: { id: { in: previousRecordIds } },
          select: {
            id: true,
            file_no: true,
            category: true,
            title: true,
            note_plain_text: true,
            entry_date_real: true,
          },
        });

        if (elaborationRecords.length > 0) {
          const context = prepareContextForAI(elaborationRecords);
          const aiResponse = await generateAIResponse(
            question,
            context,
            conversationHistory,
            queryAnalysis.queryType
          );

          return {
            response: aiResponse,
            sources: elaborationRecords.map((record) => ({
              id: record.id,
              file_no: record.file_no,
              title: record.title,
            })),
            searchQuery: searchQuery,
            searchMethod: useEnhancedSearch
              ? "enhanced_tsvector"
              : "fallback_contains",
            queryType: queryAnalysis.queryType,
            analysisUsed: true,
          };
        }
      }
    }

    if (records.length === 0) {
      let noResultsMessage =
        "I couldn't find any relevant records in the CID database for your query.";

      if (queryAnalysis.queryType === "follow_up") {
        noResultsMessage +=
          " It seems you're asking a follow-up question, but I couldn't find related records. Could you provide more specific details or rephrase your question?";
      } else if (queryAnalysis.queryType === "elaboration") {
        noResultsMessage +=
          " You asked for more details, but I don't have additional information available. Could you ask about a specific aspect you'd like to know more about?";
      } else {
        noResultsMessage +=
          " Please try rephrasing your question or using different keywords. You can also try asking for 'recent files' to see the latest entries.";
      }

      return {
        response: noResultsMessage,
        sources: [],
        searchQuery: searchQuery,
        searchMethod: useEnhancedSearch
          ? "enhanced_tsvector"
          : "fallback_contains",
        queryType: queryAnalysis.queryType,
        analysisUsed: true,
      };
    }

    // Prepare context for AI
    const context = prepareContextForAI(records);

    // Generate AI response with conversation context
    const aiResponse = await generateAIResponse(
      question,
      context,
      conversationHistory,
      queryAnalysis.queryType
    );

    // Prepare sources for reference
    const sources = records.map((record) => ({
      id: record.id,
      file_no: record.file_no,
      title: record.title,
      relevance: record.rank,
    }));

    console.log(
      `[CHAT ANALYSIS] Generated response with ${sources.length} sources`
    );

    return {
      response: aiResponse,
      sources,
      searchQuery: searchQuery,
      searchMethod: useEnhancedSearch
        ? "enhanced_tsvector"
        : "fallback_contains",
      queryType: queryAnalysis.queryType,
      analysisUsed: true,
    };
  } catch (error) {
    console.error("Enhanced chat processing error:", error);
    throw new Error("Failed to process your question. Please try again.");
  }
}

/**
 * Update search vectors for all records (maintenance function)
 */
export async function updateSearchVectors(): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE file_list 
      SET search_vector = to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(category, '') || ' ' || 
        COALESCE(note_plain_text, '') || ' ' ||
        COALESCE(file_no, '')
      )
      WHERE search_vector IS NULL OR note_plain_text IS NOT NULL
    `;

    console.log("[SEARCH VECTORS] Updated search vectors for all records");
  } catch (error) {
    console.error("Error updating search vectors:", error);
    throw new Error("Failed to update search vectors");
  }
}
