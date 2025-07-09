import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

// Developer logging toggle - set to true to see query logs in console
const DEV_LOGGING = true;

/**
 * Developer logging helper function
 */
function devLog(message: string, data?: any) {
	if (DEV_LOGGING) {
		console.log(`[AI-SERVICE-DEV] ${message}`);
		if (data !== undefined) {
			console.log(data);
		}
		console.log("---");
	}
}

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
	tokenCount?: {
		input: number;
		output: number;
	};
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
	coreSearchTerms: string;
	instructionalTerms: string;
	queryType:
		| "specific_search"
		| "follow_up"
		| "elaboration"
		| "general"
		| "recent_files"
		| "analytical_query";
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
				coreSearchTerms: currentQuery, // Keep original for context
				instructionalTerms: "",
				queryType: "recent_files",
				contextNeeded: false,
			};
		}

		const model = genAI.getGenerativeModel({
			model: "gemini-2.5-flash-preview-05-20",
		});

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
2. Extract the core search terms for database search
3. Extract the instructional terms for database search
4. Decide if conversation context is needed

Query Types:
- specific_search: Direct questions about cases, people, dates, etc. ("Details of case 123", "Who is John Doe?").
- analytical_query: Questions that require analysis, summarization, or finding patterns across multiple records (e.g., 'most common', 'how many', 'what is the trend', 'summarize').
- follow_up: Questions referring to previous results ("Who caught her?", "What happened next?").
- elaboration: Requests for more details ("Elaborate", "Tell me more", "Explain further").
- general: General questions or greetings.
- recent_files: Queries asking for recent/latest/newest files (handled separately).

IMPORTANT:
- If the query asks for "recent", "latest", "newest", or "most recent" files/records/cases, classify it as "recent_files".
- "coreSearchTerms" should be specific entities, names, IDs, or unique identifiers that directly map to data in the database. Do NOT include words that describe the type of query or action to be performed (e.g., 'summarize', 'analyze', 'case' when it's part of 'the case on X').
- "instructionalTerms" are words that describe the action (e.g., 'summarize', 'analyze') or the general type of record (e.g., 'case', 'incident') when they are not specific entities.

For follow_up and elaboration queries, you MUST extract keywords from the conversation history.

Respond in this exact JSON format:
{
  "coreSearchTerms": "extracted core search terms for database search",
  "instructionalTerms": "extracted instructional terms for database search",
  "queryType": "one of the five types above",
  "contextNeeded": true/false
}

Examples:
- "Cases from 2007?" → {"coreSearchTerms": "cases 2007", "instructionalTerms": "", "queryType": "specific_search", "contextNeeded": false}
- "Who caught her?" → {"coreSearchTerms": "caught arrest suspect", "instructionalTerms": "", "queryType": "follow_up", "contextNeeded": true}
- "Show me the most recent 3 files" → {"coreSearchTerms": "recent files", "instructionalTerms": "3", "queryType": "recent_files", "contextNeeded": false}
- "Latest cases" → {"coreSearchTerms": "latest cases", "instructionalTerms": "", "queryType": "recent_files", "contextNeeded": false}
- "Summarize the case on Zothansangi" → {"coreSearchTerms": "Zothansangi", "instructionalTerms": "summarize case", "queryType": "analytical_query", "contextNeeded": false}

`;

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
		if (!analysis.coreSearchTerms || !analysis.queryType) {
			throw new Error("Incomplete analysis from AI");
		}

		return {
			coreSearchTerms: analysis.coreSearchTerms,
			instructionalTerms: analysis.instructionalTerms || "",
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
			coreSearchTerms: fallbackKeywords || currentQuery,
			instructionalTerms: "",
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
	question: string,
	limit = 20
): Promise<SearchResult[]> {
	devLog(`Starting database search for query: "${question}"`, { limit });
	try {
		// Clean and prepare the search query for to_tsquery with OR operators.
		const tsQuery = question
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, " ") // Keep only alphanumeric and spaces
			.trim()
			.split(/\s+/)
			.filter((term) => term.length > 1 || /^\d$/.test(term)) // Allow terms longer than 1 char or single digits
			.join(" | "); // Join with OR operator for to_tsquery

		if (!tsQuery) {
			return [];
		}

		console.log(
			`[ENHANCED SEARCH] Query: "${question}" -> TSQuery: "${tsQuery}"`
		);

		// Use to_tsquery with OR logic for more flexible searching.
		// This finds records containing ANY of the search terms and ranks them.
		const records = (await prisma.$queryRawUnsafe(
			`
      SELECT 
        id,
        file_no,
        category,
        title,
        note_plain_text,
        entry_date_real,
        ts_rank(search_vector, to_tsquery('english', $1)) as rank
      FROM file_list 
      WHERE search_vector @@ to_tsquery('english', $1)
      ORDER BY rank DESC, entry_date_real DESC
      LIMIT $2
    `,
			tsQuery,
			limit
		)) as SearchResult[];

		console.log(
			`[ENHANCED SEARCH] Found ${records.length} records via tsvector.`
		);

		// If tsvector returns no results, fall back to a broader ILIKE search.
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
				question
					.toLowerCase()
					.split(/\s+/)
					.filter((term) => term.length > 2)
					.map((term) => `%${term}%`), // Individual terms for ILIKE
				`%${question.toLowerCase()}%`, // Exact phrase for priority ranking
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
		return searchDatabaseFallback(question, limit);
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
 * Optimized to reduce token usage while preserving answer quality
 *
 * This implementation uses a smart context generation approach:
 * 1. For general list queries, it optimizes by using an indexed approach
 * 2. For detailed queries, it includes full content
 * 3. Avoids duplication of metadata
 */
function prepareContextForAI(records: SearchResult[], query?: string): string {
	if (records.length === 0) {
		return "No relevant records found in the database.";
	}

	// Group records by category for smarter organization
	const recordsByCategory = records.reduce((acc, record) => {
		const category = record.category || "Uncategorized";
		if (!acc[category]) acc[category] = [];
		acc[category].push(record);
		return acc;
	}, {} as Record<string, SearchResult[]>);

	// Create a structured index of all records for quick reference
	const recordIndex = records.map((record, index) => ({
		id: record.id,
		file_no: record.file_no,
		title: record.title,
		category: record.category || "Uncategorized",
		date: record.entry_date_real?.toLocaleDateString() || "Unknown date",
		relevance: record.rank ? (record.rank * 100).toFixed(1) + "%" : "Unknown",
	}));

	// Build the full record details with optimized content
	const detailedRecords = records.map((record) => {
		let content = record.note_plain_text || "No content available";

		// Avoid duplicating metadata if it's already in the note_plain_text
		const fileNoPattern = new RegExp(`File No[^\\n]*${escapeRegExp(record.file_no)}`, "i");
		const categoryPattern = new RegExp(`Category[^\\n]*${escapeRegExp(record.category)}`, "i");
		const titlePattern = new RegExp(`Title[^\\n]*${escapeRegExp(record.title)}`, "i");

		const hasMetadataPrefix =
			fileNoPattern.test(content.substring(0, 200)) ||
			categoryPattern.test(content.substring(0, 200)) ||
			titlePattern.test(content.substring(0, 200));

		return {
			id: record.id,
			file_no: record.file_no,
			title: record.title,
			category: record.category || "Uncategorized",
			date: record.entry_date_real?.toLocaleDateString() || "Unknown date",
			content: content,
			relevance: record.rank ? (record.rank * 100).toFixed(1) + "%" : "",
		};
	});

	// Build the optimized context
	return `
DATABASE CONTEXT:

=== OVERVIEW ===
Found ${records.length} relevant records from the CID database.
The records span ${Object.keys(recordsByCategory).length} categories.
Records are listed below ordered by relevance to your query.

=== RECORD INDEX ===
${recordIndex
	.map(
		(r, i) =>
			`[${i + 1}] File: ${r.file_no} | Title: ${r.title} | Category: ${
				r.category
			} | Date: ${r.date} | Relevance: ${r.relevance}`
	)
	.join("\n")}

=== FULL RECORD DETAILS ===
${detailedRecords
	.map(
		(record, index) => `
[RECORD ${index + 1}] (Relevance: ${record.relevance})
File: ${record.file_no}
Title: ${record.title}
Category: ${record.category}
Date: ${record.date}
Content: ${record.content}
---`
	)
	.join("\n")}

=== CATEGORY SUMMARY ===
${Object.entries(recordsByCategory)
	.map(([category, records]) => `${category}: ${records.length} records`)
	.join("\n")}

END OF DATABASE CONTEXT
`;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Simple utility to estimate token count for a text string
 * This is a very rough approximation - tokens are typically 4 characters on average in English
 */
function estimateTokenCount(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * Generate AI response using Gemini with conversation context
 */
export async function generateAIResponse(
	question: string,
	context: string,
	conversationHistory: ChatMessage[] = [],
	queryType: string = "specific_search"
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
	// Ensure queryType is one of the allowed types, default to specific_search
	const allowedQueryTypes = [
		"specific_search",
		"analytical_query",
		"follow_up",
		"elaboration",
		"general",
		"recent_files",
	];
	if (!allowedQueryTypes.includes(queryType)) {
		queryType = "specific_search";
	}
	try {
		const model = genAI.getGenerativeModel({
			model: "gemini-2.5-flash-preview-05-20",
		});

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
			case "analytical_query":
				roleInstructions = `
- The user is asking an analytical question that requires summarizing or finding patterns across multiple records.
- Analyze all the provided database records to identify trends, frequencies, and key data points related to the user's question.
- Synthesize your findings into a clear, structured summary.
- Use counts, lists, and direct data points to support your analysis (e.g., 'The most common location is X, appearing 5 times.').
- Present the information in an easy-to-understand format.
`;
				break;
			case "follow_up":
				roleInstructions = `
- This is a follow-up question referring to previous conversation.
- Use both the conversation history and database records to answer.
- Connect the current question to previous context.
`;
				break;
			case "elaboration":
				roleInstructions = `
- The user wants more detailed information about previous results.
- Provide comprehensive details from the database records.
- Expand on the information with additional context.
`;
				break;
			case "recent_files":
				roleInstructions = `
- The user asked for recent/latest files.
- Present the files in a clear, organized manner.
- Include file numbers, titles, categories, and dates.
- Mention they are sorted by most recent first.
`;
				break;
			default: // specific_search and general
				roleInstructions = `
- Answer the user's specific question using the provided database records.
- Be factual and cite relevant information by referencing file numbers.
- Provide clear, organized information.
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

		// Estimate input tokens (prompt size)
		const inputTokens = estimateTokenCount(prompt);

		const result = await model.generateContent(prompt);
		const response = await result.response;
		const responseText = response.text();

		// Estimate output tokens (response size)
		const outputTokens = estimateTokenCount(responseText);

		return {
			text: responseText,
			inputTokens,
			outputTokens,
		};
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
	searchLimit: number = 100,
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
	tokenCount?: {
		input: number;
		output: number;
	};
}> {
	try {
		console.log(`[CHAT ANALYSIS] Processing query: "${question}"`);
		console.log(
			`[CHAT ANALYSIS] Conversation history length: ${conversationHistory.length}` // Increased from 4 to 100
		);

		// Analyze the query to understand intent and extract search keywords
		const queryAnalysis = await analyzeQueryForSearch(
			question,
			conversationHistory
		);

		console.log(`[CHAT ANALYSIS] Query type: ${queryAnalysis.queryType}`);
		console.log(
			`[CHAT ANALYSIS] Core search terms: "${queryAnalysis.coreSearchTerms}"`
		);
		console.log(
			`[CHAT ANALYSIS] Instructional terms: "${queryAnalysis.instructionalTerms}"`
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

			// Prepare context for AI with relevant records and original query
			const context = prepareContextForAI(records, question);

			// Generate AI response
			const {
				text: aiResponse,
				inputTokens,
				outputTokens,
			} = await generateAIResponse(
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
				tokenCount: {
					input: inputTokens,
					output: outputTokens,
				},
			};
		}

		// Use analyzed keywords for search instead of raw question
		const searchQuery = queryAnalysis.coreSearchTerms;

		// Handle general queries without database search
		if (
			queryAnalysis.queryType === "general" &&
			!queryAnalysis.coreSearchTerms.trim()
		) {
			// Generate response for non-specific queries without search
			const { text: aiResponse } = await generateAIResponse(
				question,
				"No specific database search performed. Please provide a direct answer based on general knowledge.",
				conversationHistory,
				"general"
			);

			return {
				response: aiResponse,
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
					const {
						text: aiResponse,
						inputTokens,
						outputTokens,
					} = await generateAIResponse(
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
		const {
			text: aiResponse,
			inputTokens,
			outputTokens,
		} = await generateAIResponse(
			question,
			context,
			conversationHistory,
			queryAnalysis.queryType
		);

		// Extract cited record IDs from the AI response
		const citedRecordIds = new Set<number>();
		const citationRegex = /\(Record\s+(\d+)\)/g;
		let match;
		while ((match = citationRegex.exec(aiResponse)) !== null) {
			citedRecordIds.add(parseInt(match[1], 10));
		}

		// Filter records to only include those cited in the response.
		// If no records are cited, we will return an empty array for sources.
		const relevantRecords =
			citedRecordIds.size > 0
				? records.filter((record) => citedRecordIds.has(record.id))
				: [];

		// Prepare sources for reference from the relevant (cited) records
		const sources = relevantRecords.map((record) => ({
			id: record.id,
			file_no: record.file_no,
			title: record.title,
			relevance: record.rank,
		}));

		console.log(
			`[CHAT ANALYSIS] Generated response with ${sources.length} cited sources out of ${records.length} total records used in context.`
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
			tokenCount: {
				input: inputTokens,
				output: outputTokens,
			},
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
