const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

/**
 * Script to convert MySQL dump to PostgreSQL format and import it
 *
 * Usage:
 * node scripts/convert-and-import.js <path-to-sql-file> [--clear]
 *
 * Example:
 * node scripts/convert-and-import.js ./sample_data.sql
 * node scripts/convert-and-import.js ./sample_data.sql --clear
 */

async function main() {
	try {
		// Get file path from command line arguments
		const sqlFilePath = process.argv[2];

		if (!sqlFilePath) {
			console.error("Please provide the path to the SQL file");
			console.error(
				"Usage: node scripts/convert-and-import.js <path-to-sql-file> [--clear]"
			);
			process.exit(1);
		}

		const fullPath = path.resolve(process.cwd(), sqlFilePath);

		if (!fs.existsSync(fullPath)) {
			console.error(`File not found: ${fullPath}`);
			process.exit(1);
		}

		console.log(`Converting and importing data from ${fullPath}...`);

		// Read SQL file
		const sqlContent = fs.readFileSync(fullPath, "utf8");

		// Extract CREATE TABLE and INSERT statements
		const createTableRegex =
			/CREATE TABLE `file_list` \(([^;]+)\) ENGINE=InnoDB[^;]+;/;
		const insertRegex =
			/INSERT INTO `file_list` \(([^)]+)\) VALUES\s*([\s\S]+?);/;

		const createTableMatch = createTableRegex.exec(sqlContent);
		const insertMatch = insertRegex.exec(sqlContent);

		if (!createTableMatch) {
			console.error("No CREATE TABLE statement found in the SQL file");
			process.exit(1);
		}

		if (!insertMatch || !insertMatch[2]) {
			console.error("No INSERT statements found in the SQL file");
			process.exit(1);
		}

		// Convert MySQL CREATE TABLE to PostgreSQL format
		const tableDefinition = createTableMatch[1]
			.replace(/`/g, '"')
			.replace(/int\(\d+\)/g, "integer")
			.replace(/varchar\((\d+)\)/g, "varchar($1)")
			.replace(/longtext/g, "text");

		// Extract column names and values
		const columnNames = insertMatch[1]
			.replace(/`/g, '"')
			.split(",")
			.map((col) => col.trim());
		console.log(`Found ${columnNames.length} columns in INSERT statement`);

		// Get the raw values string without replacing backticks yet
		const valuesString = insertMatch[2].replace(/\)\s*;$/, "").trim();

		// Create PostgreSQL compatible SQL
		let pgSql = "";

		// Add clear table statement if requested
		const shouldClearExisting = process.argv.includes("--clear");
		if (shouldClearExisting) {
			pgSql += 'DELETE FROM "file_list";\n';
		}

		// Add CREATE TABLE statement if needed
		pgSql += `CREATE TABLE IF NOT EXISTS "file_list" (
      "id" SERIAL PRIMARY KEY,
      ${tableDefinition}
    );

    `;

		// Add INSERT statement - skip the id column as it's auto-generated
		const pgColumnNames = columnNames.slice(1).join(", ");
		pgSql += `INSERT INTO "file_list" (${pgColumnNames}) VALUES\n`;
		console.log(`Creating INSERT statement with columns: ${pgColumnNames}`);

		// Use a more robust approach to extract value rows
		let rows = [];
		let depth = 0;
		let currentRow = "";
		let inString = false;
		let quoteChar = null;
		let escapeNext = false;

		// First, extract all rows with balanced parentheses
		for (let i = 0; i < valuesString.length; i++) {
			const char = valuesString[i];

			// Handle escape character
			if (char === "\\" && !escapeNext) {
				escapeNext = true;
				if (depth > 0) currentRow += char;
				continue;
			}

			// Handle string delimiters
			if ((char === "'" || char === '"') && !escapeNext) {
				if (!inString) {
					// Starting a string
					inString = true;
					quoteChar = char;
				} else if (char === quoteChar) {
					// Ending a string with matching quote
					inString = false;
					quoteChar = null;
				}
				// Always add quote characters to the current row if we're inside a row
				if (depth > 0) currentRow += char;
			}
			// Handle parentheses
			else if (char === "(" && !inString) {
				depth++;
				if (depth === 1) {
					// Start a new row, don't include the opening parenthesis
					currentRow = "";
				} else if (depth > 1) {
					// Include nested parentheses in the row
					currentRow += char;
				}
			} else if (char === ")" && !inString) {
				if (depth > 0) depth--;

				if (depth === 0) {
					// End of row, add it to the rows array
					rows.push(currentRow);
				} else {
					// Include nested closing parentheses in the row
					currentRow += char;
				}
			}
			// Add all other characters if we're inside a row
			else if (depth > 0) {
				currentRow += char;
				if (escapeNext) {
					escapeNext = false;
				}
			}
			// Reset escape flag if not used
			if (escapeNext && char !== "\\") {
				escapeNext = false;
			}
		}

		console.log(`Extracted ${rows.length} rows from VALUES clause`);

		// Process each row
		let formattedValues = [];
		for (const valuesRow of rows) {
			// Parse the values row, handling quoted strings and other values
			const parsedValues = parseValuesRow(valuesRow);

			if (parsedValues.length === 0) {
				console.warn("Empty row found, skipping");
				continue;
			}

			// Skip the ID (first value) as it's auto-incremented in PostgreSQL
			const pgValues = parsedValues.slice(1).map((val) => {
				if (val === null) return "NULL";
				if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
				return val;
			});

			formattedValues.push(`(${pgValues.join(", ")})`);
		}

		if (formattedValues.length === 0) {
			console.error("No values found in INSERT statement");
			console.error("Raw values string length:", valuesString.length);
			console.error(
				"First 200 characters of values string:",
				valuesString.substring(0, 200)
			);
			process.exit(1);
		}

		console.log(`Successfully parsed ${formattedValues.length} rows of data`);

		pgSql += formattedValues.join(",\n") + ";";

		// Write the PostgreSQL SQL to a temporary file
		const pgSqlPath = path.join(process.cwd(), "pg_import_temp.sql");
		fs.writeFileSync(pgSqlPath, pgSql);

		console.log("Converted SQL file written to pg_import_temp.sql");

		// Get database connection info from .env file
		const envPath = path.join(process.cwd(), ".env");
		const envContent = fs.readFileSync(envPath, "utf8");

		// Extract DATABASE_URL line
		const dbUrlLine = envContent
			.split("\n")
			.find((line) => line.startsWith("DATABASE_URL="));
		if (!dbUrlLine) {
			console.error("DATABASE_URL not found in .env file");
			process.exit(1);
		}

		// Extract the URL part (remove quotes)
		const dbUrl = dbUrlLine.replace(/^DATABASE_URL=/, "").replace(/^"|"$/g, "");

		// Handle special case with double @ in URL
		const fixedUrl = dbUrl.replace("@@", "@");
		console.log(
			"Using database URL (sanitized for logging):",
			fixedUrl.replace(/:[^@]*@/, ":***@")
		);

		// Parse the connection string manually to handle special characters
		const connectionRegex = /postgresql:\/\/(.*):(.*)@(.*)\:(\d+)\/(.*)/;
		const match = fixedUrl.match(connectionRegex);
		if (!match) {
			console.error("Could not parse DATABASE_URL format");
			process.exit(1);
		}
		const dbUser = match[1];
		const dbPassword = decodeURIComponent(match[2]);
		const dbHost = match[3];
		const dbPort = match[4];
		const dbName = match[5];

		// Database connection parameters are now extracted via URL parsing

		// Import using psql
		console.log(`Importing data into PostgreSQL database ${dbName}...`);

		const psqlCommand = `PGPASSWORD=${dbPassword} psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f pg_import_temp.sql`;

		try {
			const { stdout, stderr } = await execAsync(psqlCommand);
			console.log("Import completed successfully!");
			if (stdout) console.log("Output:", stdout);
			if (stderr) console.error("Errors:", stderr);
		} catch (error) {
			console.error("Error executing psql command:", error.message);
			if (error.stdout) console.log("Output:", error.stdout);
			if (error.stderr) console.error("Errors:", error.stderr);
			process.exit(1);
		}

		// Keep the temporary file for inspection
		console.log("Temporary SQL file kept for inspection at:", pgSqlPath);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
