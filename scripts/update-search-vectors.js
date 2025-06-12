#!/usr/bin/env node

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function updateSearchVectors() {
  try {
    console.log("🔄 Updating search vectors for all records...");

    // Update search vectors for all records
    const result = await prisma.$executeRaw`
      UPDATE file_list 
      SET search_vector = to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(category, '') || ' ' || 
        COALESCE(note_plain_text, '') || ' ' ||
        COALESCE(file_no, '') || ' ' ||
        COALESCE(entry_date, '') || ' ' ||
        COALESCE(EXTRACT(YEAR FROM entry_date_real)::text, '')
      )
      WHERE note_plain_text IS NOT NULL
    `;

    console.log(`✅ Updated search vectors for records`);

    // Get statistics
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_records,
        COUNT(search_vector) as records_with_vectors,
        COUNT(note_plain_text) as records_with_content
      FROM file_list
    `;

    console.log("📊 Search Vector Statistics:");
    console.table(stats);

    // Test the search functionality
    console.log("\n🧪 Testing enhanced search...");

    const testQueries = ["2007", "arms", "death", "money"];

    for (const query of testQueries) {
      const tsvectorResults = await prisma.$queryRaw`
        SELECT 
          id,
          file_no,
          title,
          ts_rank(search_vector, plainto_tsquery('english', ${query})) as rank
        FROM file_list 
        WHERE search_vector @@ plainto_tsquery('english', ${query})
        ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${query})) DESC
        LIMIT 3
      `;

      console.log(
        `\n🔍 Query: "${query}" - Found ${tsvectorResults.length} results`
      );
      tsvectorResults.forEach((result, index) => {
        console.log(
          `  ${index + 1}. ${result.file_no} - ${result.title} (Relevance: ${(
            result.rank * 100
          ).toFixed(1)}%)`
        );
      });
    }

    console.log("\n🎉 Search vectors updated successfully!");
    console.log(
      "💡 Your AI chat will now use enhanced PostgreSQL full-text search with relevance ranking."
    );
  } catch (error) {
    console.error("❌ Error updating search vectors:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateSearchVectors();
