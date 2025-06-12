# AI Integration Guide for CID Database

## Overview

This guide explains how to integrate AI chat functionality with your CID database for Google Gemini and other AI models. The database now contains clean plain text versions of all records optimized for AI consumption.

## Database Structure for AI

### Tables

- **`file_list`** - Main table containing documents and records
- **`category_list`** - Categorization reference

### Key Fields for AI Consumption

#### file_list table:

- `id` - Unique identifier
- `file_no` - Official file number (e.g., "MSB/CB/B-85/Arms")
- `category` - Document category (e.g., "Arms, Smuggling etc.")
- `title` - Document title
- `note` - Original HTML content (for display)
- **`note_plain_text`** - 🎯 **AI-optimized plain text** (cleaned, no HTML entities)
- `entry_date` - Human readable date
- `entry_date_real` - Searchable date field
- `doc1-doc6` - Document file paths

## Plain Text Optimization

### What We Fixed

✅ Removed HTML entities (`&nbsp;`, `&quot;`, etc.)  
✅ Converted `<br>` tags to newlines  
✅ Converted list items to bullet points  
✅ Normalized whitespace and line breaks  
✅ Removed all HTML tags  
✅ Decoded numeric HTML entities

### Example Transformation

```html
<!-- BEFORE (note field) -->
<p>
  <strong><span style="font-size:16.0pt">II. ARMS RECOVERED:</span></strong>
</p>
&nbsp;&nbsp; @ Somvela, Chuhvel. Mamit Dist.

<!-- AFTER (note_plain_text field) -->
II. ARMS RECOVERED: @ Somvela, Chuhvel. Mamit Dist.
```

## Google Gemini Integration Recommendations

### 1. Database Query Strategy

```javascript
// Example: Get records for AI processing
async function getRecordsForAI(searchTerm, limit = 10) {
  return await prisma.fileList.findMany({
    where: {
      OR: [
        { note_plain_text: { contains: searchTerm, mode: "insensitive" } },
        { title: { contains: searchTerm, mode: "insensitive" } },
        { category: { contains: searchTerm, mode: "insensitive" } },
        { file_no: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      file_no: true,
      title: true,
      category: true,
      note_plain_text: true, // Use this for AI
      entry_date_real: true,
    },
    take: limit,
    orderBy: { entry_date_real: "desc" },
  });
}
```

### 2. Context Preparation for Gemini

```javascript
function prepareContextForAI(records) {
  return records.map((record) => ({
    id: record.id,
    source: `File: ${record.file_no}`,
    title: record.title,
    category: record.category,
    content: record.note_plain_text,
    date: record.entry_date_real,
  }));
}
```

### 3. Prompt Engineering

```javascript
function createSystemPrompt() {
  return `You are an AI assistant helping users query the CID (Criminal Investigation Department) database. 

CONTEXT: You have access to police records, case files, and administrative documents from Mizoram CID.

INSTRUCTIONS:
- Answer questions based only on the provided database records
- Always cite the file number and date when referencing information
- If information is not in the database, clearly state this
- Be precise and factual in your responses
- Maintain confidentiality and professionalism

FORMAT: When citing sources, use: [File: MSB/CB/B-85/Arms, Date: 2007-05-31]`;
}

function createUserQuery(question, context) {
  return `${createSystemPrompt()}

DATABASE RECORDS:
${context
  .map(
    (record) => `
File: ${record.source}
Title: ${record.title}
Category: ${record.category}
Date: ${record.date}
Content: ${record.content}
---`
  )
  .join("\n")}

USER QUESTION: ${question}

Please provide a comprehensive answer based on the database records above.`;
}
```

## Implementation Examples

### Basic Chat Function

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function chatWithDatabase(userQuestion, searchTerm = null) {
  try {
    // 1. Search database
    const records = await getRecordsForAI(searchTerm || userQuestion);

    if (records.length === 0) {
      return {
        response:
          "I couldn't find any relevant records in the database for your query.",
        sources: [],
      };
    }

    // 2. Prepare context
    const context = prepareContextForAI(records);

    // 3. Create prompt
    const prompt = createUserQuery(userQuestion, context);

    // 4. Send to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      response: response.text(),
      sources: context.map((r) => ({
        id: r.id,
        file: r.source,
        title: r.title,
      })),
    };
  } catch (error) {
    console.error("Chat error:", error);
    throw new Error("Failed to process your question");
  }
}
```

### Advanced Search with Vector Embeddings (Optional)

For even better results, consider implementing vector search:

```javascript
// 1. Generate embeddings for note_plain_text
// 2. Store in vector database (Pinecone, Weaviate, etc.)
// 3. Use semantic search for better context retrieval

async function semanticSearch(query, limit = 5) {
  // Implementation depends on your vector database choice
  // This would find semantically similar content
}
```

## Best Practices

### 1. **Context Management**

- Limit context to 5-10 most relevant records
- Prioritize recent and high-relevance matches
- Consider token limits (Gemini Pro: ~30K tokens)

### 2. **Search Strategy**

- Use full-text search on `note_plain_text`
- Include title, category, and file_no in search
- Implement fuzzy matching for better results

### 3. **Response Quality**

- Always validate AI responses against source data
- Implement citation tracking
- Provide original file links when possible

### 4. **Security**

- Implement proper authentication
- Log all queries for audit purposes
- Consider data sensitivity and access controls

## Environment Setup

```bash
# Install Google AI SDK
npm install @google/generative-ai

# Set environment variables
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=your_postgresql_url
```

## Testing the Integration

```javascript
// Test the cleaned data
const testRecord = await prisma.fileList.findFirst({
  where: { id: 5 },
  select: { note_plain_text: true },
});

console.log("Clean text for AI:", testRecord.note_plain_text);
// Should show clean text without &nbsp; or HTML entities
```

## Monitoring and Optimization

1. **Query Performance**: Monitor database query times
2. **AI Response Quality**: Track user satisfaction
3. **Context Relevance**: Analyze which records provide best answers
4. **Token Usage**: Monitor Gemini API costs

## Future Enhancements

1. **Vector Search**: Implement semantic search capabilities
2. **Multi-modal**: Add support for document images
3. **Real-time Updates**: Sync new records automatically
4. **Advanced Filtering**: Category-based search limitations
5. **Export Features**: Generate reports from AI conversations

---

🎯 **The database is now optimized for AI consumption with clean `note_plain_text` fields ready for Google Gemini integration!**
