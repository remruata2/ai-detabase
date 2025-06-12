const fs = require('fs');
const path = require('path');
const { db } = require('../src/lib/db');

/**
 * Script to import MySQL dump data into PostgreSQL database
 * 
 * Usage:
 * npx ts-node scripts/import-file-data.ts <path-to-sql-file>
 * 
 * Example:
 * npx ts-node scripts/import-file-data.ts ./sample_data.sql
 */

async function main() {
  try {
    // Get file path from command line arguments
    const sqlFilePath = process.argv[2];
    
    if (!sqlFilePath) {
      console.error('Please provide the path to the SQL file');
      console.error('Usage: npx ts-node scripts/import-file-data.ts <path-to-sql-file>');
      process.exit(1);
    }

    const fullPath = path.resolve(process.cwd(), sqlFilePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      process.exit(1);
    }

    console.log(`Importing data from ${fullPath}...`);
    
    // Read SQL file
    const sqlContent = fs.readFileSync(fullPath, 'utf8');
    
    // Extract INSERT statements
    const insertRegex = /INSERT INTO `file_list` \(`id`, `file_no`, `category`, `title`, `note`, `doc1`, `doc2`, `doc3`, `doc4`, `doc5`, `doc6`, `entry_date`, `entry_date_real`, `note_plain_text`\) VALUES\s*(\([^;]+;)/g;
    const match = insertRegex.exec(sqlContent);
    
    if (!match || !match[1]) {
      console.error('No INSERT statements found in the SQL file');
      process.exit(1);
    }
    
    // Parse values
    const valuesString = match[1].replace(/\)\s*;$/, '');
    const valuesList = parseValues(valuesString);
    
    // Clear existing data if requested
    const shouldClearExisting = process.argv.includes('--clear');
    if (shouldClearExisting) {
      console.log('Clearing existing data from file_list table...');
      await db.fileList.deleteMany({});
      console.log('Existing data cleared.');
    }
    
    // Import data
    console.log(`Importing ${valuesList.length} records...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const values of valuesList) {
      try {
        // Convert entry_date_real to Date object
        const entryDateReal = values[12] ? new Date(values[12]) : null;
        
        await db.fileList.create({
          data: {
            // Skip id as it's auto-incremented
            file_no: values[1] || '',
            category: values[2] || '',
            title: values[3] || '',
            note: values[4] || null,
            doc1: values[5] || null,
            doc2: values[6] || null,
            doc3: values[7] || null,
            doc4: values[8] || null,
            doc5: values[9] || null,
            doc6: values[10] || null,
            entry_date: values[11] || null,
            entry_date_real: entryDateReal,
            note_plain_text: values[13] || null,
          }
        });
        
        successCount++;
        
        // Show progress
        if (successCount % 10 === 0) {
          process.stdout.write(`\rImported ${successCount}/${valuesList.length} records...`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`\nError importing record: ${error.message || 'Unknown error'}`);
      }
    }
    
    console.log(`\n\nImport completed: ${successCount} records imported successfully, ${errorCount} errors.`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

/**
 * Parse MySQL VALUES string into array of value arrays
 */
function parseValues(valuesString: string): any[][] {
  const result: any[][] = [];
  let currentPosition = 0;
  let inString = false;
  let currentValue = '';
  let currentRow: any[] = [];
  
  // Helper function to process a completed value
  const addValue = () => {
    // Convert MySQL NULL to JavaScript null
    if (currentValue === 'NULL') {
      currentRow.push(null);
    } 
    // Remove quotes from string values
    else if (
      (currentValue.startsWith("'") && currentValue.endsWith("'")) || 
      (currentValue.startsWith('"') && currentValue.endsWith('"'))
    ) {
      // Remove quotes and unescape MySQL escaped characters
      const unescaped = currentValue
        .substring(1, currentValue.length - 1)
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      
      currentRow.push(unescaped);
    } 
    // Handle numeric values
    else {
      const num = Number(currentValue);
      currentRow.push(isNaN(num) ? currentValue : num);
    }
    
    currentValue = '';
  };
  
  // Process the string character by character
  while (currentPosition < valuesString.length) {
    const char = valuesString[currentPosition];
    
    // Handle opening parenthesis - start of a row
    if (char === '(' && !inString) {
      currentRow = [];
    }
    // Handle closing parenthesis - end of a row
    else if (char === ')' && !inString) {
      if (currentValue) {
        addValue();
      }
      result.push(currentRow);
      
      // Skip comma and whitespace after closing parenthesis
      currentPosition++;
      while (
        currentPosition < valuesString.length && 
        (valuesString[currentPosition] === ',' || /\s/.test(valuesString[currentPosition]))
      ) {
        currentPosition++;
      }
      currentPosition--; // Adjust for the increment at the end of the loop
    }
    // Handle commas between values
    else if (char === ',' && !inString) {
      addValue();
    }
    // Handle string delimiters
    else if ((char === "'" || char === '"')) {
      // Check if this is an escaped quote
      const prevChar = currentPosition > 0 ? valuesString[currentPosition - 1] : '';
      if (prevChar === '\\') {
        // This is an escaped quote, add it to the current value
        currentValue += char;
      } else {
        // This is a string delimiter
        inString = !inString;
        currentValue += char;
      }
    }
    // Add character to current value
    else {
      currentValue += char;
    }
    
    currentPosition++;
  }
  
  return result;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
