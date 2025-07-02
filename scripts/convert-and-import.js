const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const { URL } = require("url");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Comprehensive HTML to plain text conversion (final refined order)
function htmlToPlainText(html) {
  if (!html) return null;

  let text = String(html); // Ensure it's a string

  // Step 1: Normalize all newline types to a single \n character.
  // This is crucial to do first so all subsequent regexes operate on consistent newlines.
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Step 2: Replace specific HTML tags with appropriate newline structures.
  // <br> becomes a single newline.
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Block-level elements that typically denote paragraph breaks or major sections become double newlines.
  text = text.replace(/<\/?(p|div|h[1-6]|table|thead|tbody|tfoot|tr|th|td|ul|ol|dl|section|article|aside|header|footer|nav|figure|figcaption|blockquote|hr|address|pre)[^>]*>/gi, "\n\n");
  // List items get a newline and a bullet (can be refined for ordered lists if needed).
  text = text.replace(/<li[^>]*>/gi, "\n• ");

  // Step 3: Remove all remaining HTML tags.
  // This is done after specific tag handling to preserve their structural newline contributions.
  text = text.replace(/<[^>]+>/g, "");

  // Step 4: Convert literal newline strings (e.g., "\r\n") to actual newlines.
  // This must be done *after* stripping HTML (which might contain these literals)
  // and *before* entity decoding and final newline consolidation.
  text = text.replace(/\\r\\n|\\n|\\r/g, "\n"); // Match literal \r\n, \n, or \r

  // Step 5: Decode HTML entities.
  const entityMap = {
    "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
    "&#39;": "'", "&apos;": "'", "&rsquo;": "'", "&lsquo;": "'", "&rdquo;": '"',
    "&ldquo;": '"', "&middot;": "·", "&bull;": "•", "&ndash;": "–", "&mdash;": "—",
    "&hellip;": "…", "&copy;": "©", "&reg;": "®", "&trade;": "™", "&deg;": "°",
    "&plusmn;": "±", "&micro;": "µ", "&para;": "¶", "&sect;": "§", "&dagger;": "†",
    "&Dagger;": "‡", "&permil;": "‰", "&laquo;": "«", "&raquo;": "»", "&times;": "×",
    "&divide;": "÷",
  };
  for (const [entity, replacement] of Object.entries(entityMap)) {
    text = text.replace(new RegExp(entity, "gi"), replacement);
  }
  text = text.replace(/&#(\d+);/g, (match, num) => String.fromCharCode(parseInt(num, 10)));
  text = text.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Step 6: Consolidate whitespace and newlines.
  // Collapse multiple spaces/tabs into a single space.
  text = text.replace(/[ \t]+/g, " ");
  // CRITICAL: Collapse sequences of 2 or more newlines (optionally separated by whitespace)
  // into exactly two newlines. This ensures no more than one blank line.
  text = text.replace(/(\n\s*){2,}/g, "\n\n");
  // Trim leading/trailing whitespace (including newlines) from the entire string.
  text = text.replace(/^\s+|\s+$/g, "");

  return text || null;
}

function splitValuesStringIntoRows(valuesString) {
    const rows = [];
    let parenDepth = 0;
    let inString = false;
    let quoteChar = null;
    let isEscaped = false;
    let rowStart = 0;

    const trimmed = valuesString.trim();

    for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];

        if (isEscaped) {
            isEscaped = false;
            continue;
        }

        if (char === '\\') {
            isEscaped = true;
            continue;
        }

        if (inString) {
            if (char === quoteChar) {
                if (i + 1 < trimmed.length && trimmed[i + 1] === quoteChar) {
                    i++; // Skip next char for doubled-up quotes
                } else {
                    inString = false;
                }
            }
        } else {
            if (char === "'" || char === '"') {
                inString = true;
                quoteChar = char;
            } else if (char === '(') {
                if (parenDepth === 0) {
                    rowStart = i + 1; // Mark the start of the row's content
                }
                parenDepth++;
            } else if (char === ')') {
                parenDepth--;
                if (parenDepth === 0) {
                    rows.push(trimmed.substring(rowStart, i));
                }
            }
        }
    }
    return rows;
}

function parseValuesRow(rowString) {
    const values = [];
    let currentVal = '';
    let inString = false;
    let quoteChar = null;
    let escapeNext = false;
    for (let i = 0; i < rowString.length; i++) {
        const char = rowString[i];
        if (escapeNext) {
            currentVal += char;
            escapeNext = false;
            continue;
        }
        if (char === '\\') {
            escapeNext = true;
            currentVal += char;
            continue;
        }
        if (inString) {
            if (char === quoteChar) {
                if (i + 1 < rowString.length && rowString[i + 1] === quoteChar) {
                    currentVal += char + char;
                    i++;
                } else {
                    inString = false;
                    currentVal += char;
                }
            } else {
                currentVal += char;
            }
        } else {
            if (char === "'" || char === '"') {
                inString = true;
                quoteChar = char;
                currentVal += char;
            } else if (char === ',') {
                values.push(currentVal.trim());
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
    }
    values.push(currentVal.trim());
    return values.map(val => {
        if (val.toLowerCase() === 'null') {
            return null;
        }
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            return val.substring(1, val.length - 1)
                .replace(/''/g, "'")
                .replace(/""/g, '"')
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, "\\");
        }
        if (val !== '' && !isNaN(val)) {
            return Number(val);
        }
        return val;
    });
}

async function processSingleFile(sqlFilePath, clearTable) {
    try {
        const fullPath = path.resolve(sqlFilePath);
        console.log(`Converting and importing data from ${fullPath}...`);
        const sqlContent = fs.readFileSync(fullPath, "utf-8");
        const createTableRegex = /CREATE TABLE `file_list`[\s\S]*?;/i;
        const createTableMatch = sqlContent.match(createTableRegex);
        if (!createTableMatch) {
            throw new Error("CREATE TABLE statement for 'file_list' not found.");
        }

        let pgCreateTable = createTableMatch[0];
        pgCreateTable = pgCreateTable
            .replace(/CREATE TABLE `file_list`/i, 'CREATE TABLE IF NOT EXISTS "file_list"')
            .replace(/`id` int\(11\) NOT NULL AUTO_INCREMENT,/i, '"id" SERIAL PRIMARY KEY,')
            .replace(/`(\w+)`/g, '"$1"') // Replace all backticks with double quotes
            .replace(/\s+varchar\(\d+\)/ig, ' VARCHAR')
            .replace(/\s+longtext/ig, ' TEXT')
            .replace(/\s+int\(\d+\)/ig, ' INTEGER')
            .replace(/\s+date/ig, ' DATE')
            .replace(/ DEFAULT NULL/ig, '')
            .replace(/ NOT NULL/ig, '')
            .replace(/PRIMARY KEY \("id"\)/i, '') // Look for double-quoted id
            .replace(/ENGINE=[\s\S]*/i, ';')
            .replace(/(\n\s*"entry_date_real" DATE)/i, '$1,\n  "note_plain_text" TEXT'); // Add note_plain_text column
        const statements = sqlContent.split(/;\s*[\r\n]+/);
        const allRows = [];
        let columnList = null;
        let insertCount = 0;
        const insertRegex = /INSERT INTO `file_list` \(([`\w,\s]+)\) VALUES([\s\S]+)/i;

        for (const statement of statements) {
            const trimmedStatement = statement.trim();
            if (!trimmedStatement.toUpperCase().startsWith('INSERT INTO `FILE_LIST`')) {
                continue;
            }

            const insertMatch = trimmedStatement.match(insertRegex);
            if (!insertMatch) {
                console.warn(`Could not parse INSERT statement: ${trimmedStatement.substring(0, 100)}...`);
                continue;
            }
            
            insertCount++;
            if (!columnList) {
                columnList = insertMatch[1].split(",").map(c => c.trim().replace(/`/g, '"'));
                // Add note_plain_text to the column list if it's not already there (e.g. from dump)
                if (!columnList.includes('"note_plain_text"')) {
                    const noteColumnIndex = columnList.findIndex(col => col === '"note"');
                    if (noteColumnIndex !== -1) {
                        columnList.splice(noteColumnIndex + 1, 0, '"note_plain_text"');
                    } else {
                        // Fallback if 'note' column isn't found, though it should be.
                        columnList.push('"note_plain_text"'); 
                    }
                }
            }
            const valuesString = insertMatch[2];
            const rows = splitValuesStringIntoRows(valuesString);
            if (rows) {
                rows.forEach((rowString) => {
                    const parsedValues = parseValuesRow(rowString);
                    // Find the original 'note' column index based on the INSERT statement's column list
                    const originalColumnList = insertMatch[1].split(",").map(c => c.trim().replace(/`/g, '"'));
                    const noteColumnIndexInDump = originalColumnList.findIndex(col => col === '"note"');

                    let finalParsedValues = [...parsedValues];

                    if (noteColumnIndexInDump !== -1 && parsedValues[noteColumnIndexInDump]) {
                        const originalNote = String(parsedValues[noteColumnIndexInDump]);
                        const noteHtml = originalNote;
                        const plainTextNote = htmlToPlainText(noteHtml);
                        
                        // Find where to insert note_plain_text in the final PG column list
                        const notePlainTextPgIndex = columnList.findIndex(col => col === '"note_plain_text"');
                        if (notePlainTextPgIndex !== -1) {
                             finalParsedValues.splice(notePlainTextPgIndex, 0, plainTextNote);
                        } else {
                            // This case should ideally not happen if columnList is managed correctly
                            finalParsedValues.push(plainTextNote);
                        }
                    }

                    if (finalParsedValues.length === columnList.length) {
                        allRows.push(finalParsedValues);
                    } else {
                        console.warn(`Skipping row due to column mismatch. Expected ${columnList.length}, got ${parsedValues.length}. Row: ${rowString.substring(0, 200)}...`);
                    }
                });
            }
        }
        console.log(`Found ${insertCount} INSERT statements.`);
        if (!columnList) {
            throw new Error("Could not determine column list from INSERT statements.");
        }
        console.log(`Using columns for PostgreSQL INSERT: ${columnList.join(", ")}`);
        if (allRows.length === 0) {
            console.log("No data to import.");
            return;
        }
        console.log(`Successfully parsed ${allRows.length} total rows of data`);
        const pgValues = allRows.map(row => 
            `(${row.map(val => {
                if (val === null || val === '0000-00-00') {
                    return 'NULL';
                }
                if (typeof val === 'number') {
                    return val;
                }
                return `'${String(val).replace(/'/g, "''")}'`;
            }).join(', ')})`
        ).join(',\n');

        let pgImportScript = "SET client_min_messages TO WARNING;\n";
        if (clearTable) {
            pgImportScript += `TRUNCATE TABLE "file_list" RESTART IDENTITY CASCADE;\n`;
        }
        pgImportScript += `${pgCreateTable}\n\n`;
        pgImportScript += `INSERT INTO "file_list" (${columnList.join(", ")}) VALUES\n${pgValues};\n`;
        const tempFilePath = path.resolve(__dirname, "../pg_import_temp.sql");
        fs.writeFileSync(tempFilePath, pgImportScript);
        console.log(`Converted SQL file written to ${path.basename(tempFilePath)}`);
        
        const dbUrlString = process.env.DATABASE_URL;
        if (!dbUrlString) {
            throw new Error("DATABASE_URL not found in .env file.");
        }
        const correctedDbUrl = dbUrlString.replace('@@', '@');
        const dbUrl = new URL(correctedDbUrl);
        const user = decodeURIComponent(dbUrl.username);
        const password = decodeURIComponent(dbUrl.password);
        const host = dbUrl.hostname;
        const port = dbUrl.port;
        const dbname = dbUrl.pathname.split('/')[1];

        console.log(`Using database URL (sanitized for logging): postgresql://***@${host}:${port}/${dbname}`);
        const psqlCommand = `PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${dbname}" -f "${tempFilePath}"`;
        console.log(`Importing data into PostgreSQL database ${dbname}...`);
        try {
            const { stdout, stderr } = await new Promise((resolve, reject) => {
                exec(psqlCommand, (error, stdout, stderr) => {
                    // Treat stderr 'ERROR:' as a failure, as psql might not exit with a non-zero code
                    if (error || (stderr && stderr.toUpperCase().includes("ERROR:"))) {
                        const err = error || new Error(`psql command failed with stderr: ${stderr.trim()}`);
                        err.stdout = stdout;
                        err.stderr = stderr;
                        reject(err);
                        return;
                    }
                    resolve({ stdout, stderr });
                });
            });
            console.log("Import completed successfully!");
            if (stdout) console.log("Output:", stdout.trim());
            if (stderr && !stderr.includes("NOTICE")) {
                 console.error("Errors:", stderr.trim());
            } else if (stderr) {
                 console.log("Notices:", stderr.trim());
            }
            fs.unlinkSync(tempFilePath);
        } catch (error) {
            console.error(`\n--- Import failed ---`);
            console.error(`Error message: ${error.message.split('\n')[0]}`);
            if (error.stderr) {
                console.error("\npsql stderr:");
                console.error(error.stderr.trim());
            }
            if (error.stdout) {
                console.log("\npsql stdout:");
                console.log(error.stdout.trim());
            }
            console.error(`\nTemporary SQL file kept for inspection at: ${tempFilePath}`);
            process.exit(1);
        }
    } catch (error) {
        console.error("An unexpected error occurred:", error);
        process.exit(1);
    }
}

async function main() {
    const commandArgs = process.argv.slice(2);
    const initialClearTable = commandArgs.includes('--clear');

    // List of SQL files to process (excluding CID_DB_3.sql as it's done)
    const sqlFilePaths = [
        "database/CID_DB_1.sql",
        "database/CID_DB_2.sql",
        // "database/CID_DB_3.sql", // Already processed
        "database/CID_DB_4.sql",
        "database/CID_DB_5.sql",
        "database/CID_DB_6.sql",
        "database/CID_DB_7.sql",
        "database/CID_DB_8.sql"
    ].map(relativePath => path.resolve(__dirname, '..', relativePath)); // Ensure absolute paths

    if (sqlFilePaths.length === 0) {
        console.log("No SQL files specified for import.");
        return;
    }

    for (let i = 0; i < sqlFilePaths.length; i++) {
        const sqlFilePath = sqlFilePaths[i];
        // Clear the table only before the first file IF --clear was specified
        const clearTableForThisFile = (i === 0) && initialClearTable;
        
        console.log(`\nProcessing file ${i + 1} of ${sqlFilePaths.length}: ${path.basename(sqlFilePath)} (Clear table: ${clearTableForThisFile})`);
        try {
            await processSingleFile(sqlFilePath, clearTableForThisFile);
        } catch (error) {
            console.error(`Error processing file ${sqlFilePath}:`, error);
            // Decide if you want to stop on error or continue with next file
            // For now, let's stop.
            console.error("Aborting due to error.");
            process.exit(1);
        }
    }
    console.log("\nAll specified SQL files processed.");
}

main();
