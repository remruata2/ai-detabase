const { PrismaClient } = require("./src/generated/prisma");

const prisma = new PrismaClient();

// Import the DocumentParser class (simplified version for testing)
class TestDocumentParser {
  static convertFormTableToMarkdown(rows) {
    let markdown = "\n\n";

    // Process each row intelligently
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (row.length === 0) continue;

      // Skip header rows that are just navigation or table structure
      if (i === 0 && row.length >= 2) {
        const firstCell = row[0].toLowerCase().trim();
        const secondCell = row[1].toLowerCase().trim();

        if (
          firstCell.includes("update") ||
          firstCell.includes("back") ||
          (firstCell.includes("sn") && secondCell.includes("particulars"))
        ) {
          continue;
        }
      }

      // Skip separator rows (rows with just dashes)
      if (row.length === 1 && row[0].trim() === "---") continue;
      if (row.every((cell) => cell.trim() === "---")) continue;

      // Handle section headers (all caps or specific patterns)
      if (row.length === 1) {
        const content = row[0].trim();
        if (content && content !== " ") {
          if (
            content.toUpperCase() === content ||
            content.includes("Related Info") ||
            content.includes("Details") ||
            content.includes("Proceeding")
          ) {
            markdown += `## ${content}\n\n`;
            continue;
          }
        }
      }

      // Handle numbered field rows (like "1 | Name of Child | Janet Lalhruaiawmi")
      if (row.length >= 3) {
        const firstCell = row[0].trim();
        const secondCell = row[1].trim();
        const thirdCell = row[2].trim();

        // Check if this is a numbered field (e.g., "1", "2", "3")
        if (/^\d+$/.test(firstCell) && secondCell && thirdCell) {
          // This is a numbered field with value
          markdown += `**${secondCell}:** ${thirdCell}\n\n`;
          continue;
        }

        // Handle multi-part fields (like "Age with date of birth | Date of Birth | 28.08.2010")
        if (secondCell && thirdCell && !/^\d+$/.test(firstCell)) {
          // This might be a field with sub-fields
          if (
            firstCell.includes("Age") ||
            firstCell.includes("address") ||
            firstCell.includes("Family")
          ) {
            markdown += `**${firstCell}:**\n`;
            markdown += `  - **${secondCell}:** ${thirdCell}\n\n`;
            continue;
          }
        }
      }

      // Handle simple field-value pairs
      if (row.length === 2) {
        const field = row[0].trim();
        const value = row[1].trim();

        if (field && value && value !== " " && value !== "---") {
          markdown += `**${field}:** ${value}\n\n`;
        } else if (field && field !== "---") {
          markdown += `**${field}:**\n\n`;
        }
      }

      // Handle complex multi-column rows by extracting meaningful pairs
      if (row.length > 3) {
        let currentField = "";
        let currentValue = "";

        for (let j = 0; j < row.length; j++) {
          const cell = row[j].trim();

          if (!cell || cell === "---") continue;

          // If this looks like a field name (contains keywords)
          if (
            cell.includes("Name") ||
            cell.includes("Date") ||
            cell.includes("Age") ||
            cell.includes("Sex") ||
            cell.includes("Address") ||
            cell.includes("Status") ||
            cell.includes("Level") ||
            cell.includes("Type") ||
            cell.includes("No")
          ) {
            // If we have a previous field-value pair, output it
            if (currentField && currentValue) {
              markdown += `**${currentField}:** ${currentValue}\n\n`;
            }

            currentField = cell;
            currentValue = "";
          } else {
            // This looks like a value
            if (currentValue) {
              currentValue += ", " + cell;
            } else {
              currentValue = cell;
            }
          }
        }

        // Output the last field-value pair
        if (currentField && currentValue) {
          markdown += `**${currentField}:** ${currentValue}\n\n`;
        }
      }
    }

    return markdown;
  }
}

async function testTableConversion() {
  try {
    console.log("🧪 Testing table conversion...");

    // Get the record with the POCSO data
    const record = await prisma.fileList.findFirst({
      where: {
        file_no: "Pocso",
      },
      select: {
        id: true,
        file_no: true,
        title: true,
        note: true,
      },
    });

    if (!record || !record.note) {
      console.log("❌ No POCSO record found or no content");
      return;
    }

    console.log(
      `📄 Testing conversion for record: ${record.file_no} - ${record.title}\n`
    );

    // Parse the markdown table into rows
    const lines = record.note.split("\n");
    const rows = [];

    for (const line of lines) {
      if (line.trim() && line.includes("|")) {
        const cells = line.split("|").map((cell) => cell.trim());
        if (cells.length > 1) {
          rows.push(cells);
        }
      }
    }

    console.log(`📊 Parsed ${rows.length} table rows\n`);

    // Test the conversion
    const convertedMarkdown =
      TestDocumentParser.convertFormTableToMarkdown(rows);

    console.log("✅ CONVERTED MARKDOWN:");
    console.log(convertedMarkdown);

    // Check if important data is preserved
    const hasChildName = convertedMarkdown.includes("Janet Lalhruaiawmi");
    const hasChildAge = convertedMarkdown.includes("13");
    const hasChildSex = convertedMarkdown.includes("Male");

    console.log("\n🔍 DATA PRESERVATION CHECK:");
    console.log(
      `Child Name (Janet Lalhruaiawmi): ${hasChildName ? "✅" : "❌"}`
    );
    console.log(`Child Age (13): ${hasChildAge ? "✅" : "❌"}`);
    console.log(`Child Sex (Male): ${hasChildSex ? "✅" : "❌"}`);
  } catch (error) {
    console.error("❌ Error testing table conversion:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testTableConversion();
