#!/usr/bin/env node

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

// Comprehensive HTML to plain text conversion for AI consumption
function htmlToPlainText(html) {
  if (!html) return null;

  let text = html;

  // First, replace <br> tags with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Replace paragraph and div tags with double newlines for better separation
  text = text.replace(/<\/?(p|div)[^>]*>/gi, "\n\n");

  // Replace list items with newlines and bullets
  text = text.replace(/<li[^>]*>/gi, "\n• ");
  text = text.replace(/<\/li>/gi, "");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  const entityMap = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&rsquo;": "'",
    "&lsquo;": "'",
    "&rdquo;": '"',
    "&ldquo;": '"',
    "&middot;": "·",
    "&bull;": "•",
    "&ndash;": "–",
    "&mdash;": "—",
    "&hellip;": "…",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&deg;": "°",
    "&plusmn;": "±",
    "&micro;": "µ",
    "&para;": "¶",
    "&sect;": "§",
    "&dagger;": "†",
    "&Dagger;": "‡",
    "&permil;": "‰",
    "&laquo;": "«",
    "&raquo;": "»",
    "&times;": "×",
    "&divide;": "÷",
  };

  // Replace known HTML entities
  for (const [entity, replacement] of Object.entries(entityMap)) {
    text = text.replace(new RegExp(entity, "gi"), replacement);
  }

  // Handle numeric HTML entities (&#123; or &#x1A;)
  text = text.replace(/&#(\d+);/g, (match, num) => {
    return String.fromCharCode(parseInt(num, 10));
  });

  text = text.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Clean up excessive whitespace and newlines
  text = text.replace(/[ \t]+/g, " "); // Multiple spaces/tabs to single space
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n"); // Multiple newlines to double newline
  text = text.replace(/^\s+|\s+$/g, ""); // Trim leading/trailing whitespace

  // Remove Windows line endings and normalize to Unix
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return text || null;
}

async function cleanPlainTextData() {
  try {
    console.log("🔄 Starting plain text cleanup...");

    // Get all records that have HTML content
    const records = await prisma.fileList.findMany({
      where: {
        note: {
          not: null,
        },
      },
      select: {
        id: true,
        note: true,
        note_plain_text: true,
      },
    });

    console.log(`📄 Found ${records.length} records to process`);

    let updated = 0;
    let skipped = 0;

    for (const record of records) {
      const newPlainText = htmlToPlainText(record.note);

      // Only update if the plain text has changed
      if (newPlainText !== record.note_plain_text) {
        await prisma.fileList.update({
          where: { id: record.id },
          data: {
            note_plain_text: newPlainText,
          },
        });

        console.log(`✅ Updated record ID ${record.id}`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`\n🎉 Cleanup completed!`);
    console.log(`   📝 Updated: ${updated} records`);
    console.log(`   ⏭️  Skipped: ${skipped} records (no changes needed)`);
    console.log(`   📊 Total processed: ${records.length} records`);
  } catch (error) {
    console.error("❌ Error during plain text cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanPlainTextData()
  .then(() => {
    console.log("✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
