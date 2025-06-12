# MySQL to PostgreSQL Conversion Manual

## Overview

This manual provides step-by-step instructions for converting MySQL database dumps to PostgreSQL format and importing them into your existing PostgreSQL database.

## Prerequisites

- Python 3.6 or higher
- Node.js and npm
- Prisma CLI (`npx prisma`)
- Access to your PostgreSQL database
- Your project should have a `prisma/schema.prisma` file

## File Structure

After conversion, you'll have several files:

- `original_dump.sql` - Your original MySQL dump
- `conversion_script.py` - Python script for conversion
- `converted_output.sql` - PostgreSQL-compatible SQL
- `import_log.txt` - Import results and logs

## Step-by-Step Conversion Process

### Step 1: Analyze the MySQL Dump

```bash
# Check the structure of your MySQL dump
head -20 your_dump.sql
tail -20 your_dump.sql

# Count the number of INSERT statements
grep -c "INSERT INTO" your_dump.sql

# Count the number of records (lines starting with numbers in parentheses)
grep -c "^([0-9]" your_dump.sql

# List all table names in the dump
grep -o "INSERT INTO \`[^`]*\`" your_dump.sql | sort -u
```

### Step 2: Create the Conversion Script

Create a file called `mysql_to_postgres_converter.py`:

```python
#!/usr/bin/env python3
"""
MySQL to PostgreSQL Conversion Script
Customize this template for your specific dump structure
"""

import re
import subprocess
import sys
from datetime import datetime

def analyze_dump(file_path):
    """Analyze the MySQL dump structure"""
    print(f"Analyzing dump file: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find tables
    tables = re.findall(r'INSERT INTO `([^`]+)`', content)
    print(f"Tables found: {set(tables)}")

    # Count INSERT statements
    insert_count = len(re.findall(r'INSERT INTO', content))
    print(f"INSERT statements: {insert_count}")

    # Count records (assuming format: (id, ...)
    record_matches = re.findall(r'^\([0-9]+,', content, re.MULTILINE)
    print(f"Data records found: {len(record_matches)}")

    # Show sample record IDs
    record_ids = [int(match[1:-1]) for match in record_matches[:10]]
    print(f"Sample record IDs: {record_ids}")

    return {
        'tables': list(set(tables)),
        'insert_count': insert_count,
        'record_count': len(record_matches),
        'content': content
    }

def parse_mysql_records(content, table_name):
    """Parse MySQL records for a specific table"""

    print(f"Parsing records for table: {table_name}")

    # Method 1: Multiple INSERT statements
    pattern1 = rf'INSERT INTO `{table_name}`[^;]*VALUES\s*\((.*?)\);'
    matches1 = re.findall(pattern1, content, re.DOTALL)

    # Method 2: Single INSERT with multiple VALUES
    pattern2 = rf'INSERT INTO `{table_name}`[^;]*VALUES\s*(.*?);'
    matches2 = re.findall(pattern2, content, re.DOTALL)

    records = []

    # Process Method 1 matches
    for match in matches1:
        record = parse_single_record(match)
        if record:
            records.append(record)

    # Process Method 2 matches (multiple records in one INSERT)
    for match in matches2:
        # Split by ),( to get individual records
        if '),(' in match:
            individual_records = match.split('),(')
            for i, rec in enumerate(individual_records):
                # Clean up the record
                if i == 0:
                    rec = rec.lstrip('(')
                if i == len(individual_records) - 1:
                    rec = rec.rstrip(')')

                record = parse_single_record(rec)
                if record:
                    records.append(record)
        else:
            # Single record
            clean_match = match.strip('()')
            record = parse_single_record(clean_match)
            if record:
                records.append(record)

    print(f"Parsed {len(records)} records")
    return records

def parse_single_record(record_str):
    """Parse a single record string into fields"""

    # Simple field parsing (customize based on your data structure)
    fields = []
    current_field = ""
    in_quotes = False
    quote_char = None
    i = 0

    while i < len(record_str):
        char = record_str[i]

        if not in_quotes:
            if char in ["'", '"']:
                in_quotes = True
                quote_char = char
                current_field = ""
            elif char == ',':
                fields.append(clean_field(current_field))
                current_field = ""
            else:
                current_field += char
        else:
            if char == quote_char:
                # Check for escaped quote
                if i + 1 < len(record_str) and record_str[i + 1] == quote_char:
                    current_field += char
                    i += 1  # Skip next quote
                else:
                    in_quotes = False
                    quote_char = None
            else:
                current_field += char

        i += 1

    # Add last field
    if current_field:
        fields.append(clean_field(current_field))

    return fields

def clean_field(field):
    """Clean and format a field value"""
    if not field:
        return ''

    field = field.strip()

    # Handle NULL
    if field.upper() == 'NULL':
        return ''

    # Remove outer quotes
    if (field.startswith("'") and field.endswith("'")) or \
       (field.startswith('"') and field.endswith('"')):
        field = field[1:-1]

    # Unescape quotes
    field = field.replace("''", "'").replace('""', '"')
    field = field.replace("\\'", "'").replace('\\"', '"')

    return field

def create_postgres_sql(records, table_name, field_mapping):
    """Create PostgreSQL INSERT statements"""

    sql_statements = []
    sql_statements.append(f"-- PostgreSQL import for {table_name}")
    sql_statements.append(f"-- Generated on {datetime.now()}")
    sql_statements.append(f"-- Records: {len(records)}")
    sql_statements.append("")

    for record in records:
        if len(record) >= len(field_mapping):
            # Create field-value pairs
            field_names = ', '.join([f'"{field}"' for field in field_mapping.keys()])

            values = []
            for i, field_name in enumerate(field_mapping.keys()):
                value = record[i] if i < len(record) else ''

                # Escape single quotes for PostgreSQL
                if value:
                    value = str(value).replace("'", "''")
                    values.append(f"'{value}'")
                else:
                    values.append("''")

            values_str = ', '.join(values)

            sql = f'''INSERT INTO "{table_name}" ({field_names}) VALUES ({values_str}) ON CONFLICT (id) DO NOTHING;'''
            sql_statements.append(sql)
            sql_statements.append("")

    return '\n'.join(sql_statements)

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 mysql_to_postgres_converter.py <mysql_dump.sql>")
        sys.exit(1)

    input_file = sys.argv[1]

    # Step 1: Analyze the dump
    analysis = analyze_dump(input_file)

    # Step 2: Configure field mapping (CUSTOMIZE THIS)
    field_mapping = {
        'id': 'INTEGER',
        'file_no': 'TEXT',
        'category': 'TEXT',
        'title': 'TEXT',
        'note': 'TEXT',
        'doc1': 'TEXT',
        'doc2': 'TEXT',
        'doc3': 'TEXT',
        'doc4': 'TEXT',
        'doc5': 'TEXT',
        'doc6': 'TEXT',
        'entry_date': 'TEXT',
        'entry_date_real': 'DATE',
        'note_plain_text': 'TEXT'
    }

    # Step 3: Parse records for each table
    all_sql = []

    for table_name in analysis['tables']:
        print(f"\nProcessing table: {table_name}")
        records = parse_mysql_records(analysis['content'], table_name)

        if records:
            postgres_sql = create_postgres_sql(records, table_name, field_mapping)
            all_sql.append(postgres_sql)

            print(f"Generated SQL for {len(records)} records")
        else:
            print(f"No records found for table: {table_name}")

    # Step 4: Write output file
    output_file = input_file.replace('.sql', '_postgres.sql')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(all_sql))

    print(f"\nConversion complete!")
    print(f"Output file: {output_file}")

    # Step 5: Import via Prisma
    print("\nImporting to database via Prisma...")
    try:
        result = subprocess.run([
            'npx', 'prisma', 'db', 'execute',
            '--file', output_file,
            '--schema', 'prisma/schema.prisma'
        ], capture_output=True, text=True, check=True)

        print("✅ Import successful!")

    except subprocess.CalledProcessError as e:
        print(f"❌ Import failed: {e}")
        print(f"Error: {e.stderr}")
        print("\nYou can manually import using:")
        print(f"npx prisma db execute --file {output_file} --schema prisma/schema.prisma")

if __name__ == "__main__":
    main()
```

### Step 3: Run the Conversion

```bash
# Make the script executable
chmod +x mysql_to_postgres_converter.py

# Run the conversion
python3 mysql_to_postgres_converter.py your_dump.sql
```

### Step 4: Verify the Results

```bash
# Check the generated PostgreSQL file
head -50 your_dump_postgres.sql

# Verify record count
grep -c "INSERT INTO" your_dump_postgres.sql

# Check for any syntax errors
npx prisma db execute --file your_dump_postgres.sql --schema prisma/schema.prisma --dry-run
```

## Common Issues and Solutions

### Issue 1: Character Encoding Problems

**Problem**: Special characters appear garbled
**Solution**:

```bash
# Check file encoding
file -I your_dump.sql

# Convert if needed
iconv -f ISO-8859-1 -t UTF-8 your_dump.sql > your_dump_utf8.sql
```

### Issue 2: Large HTML Content Breaks Parsing

**Problem**: Complex HTML in fields breaks the parser
**Solution**: Use a more robust field parser or pre-process the dump:

```python
def robust_field_parser(record_str):
    """More robust parsing for complex content"""
    import csv
    import io

    # Try using CSV parser for better quote handling
    try:
        reader = csv.reader(io.StringIO(record_str))
        fields = next(reader)
        return fields
    except:
        # Fallback to simple parsing
        return simple_field_parser(record_str)
```

### Issue 3: Date Format Differences

**Problem**: MySQL date formats don't match PostgreSQL
**Solution**: Convert dates during parsing:

```python
def convert_mysql_date(date_str):
    """Convert MySQL date to PostgreSQL format"""
    try:
        # Handle common MySQL date formats
        if '/' in date_str:
            # dd/mm/yyyy -> yyyy-mm-dd
            parts = date_str.split('/')
            return f"{parts[2]}-{parts[1]:0>2}-{parts[0]:0>2}"
        return date_str
    except:
        return date_str
```

### Issue 4: Memory Issues with Large Dumps

**Problem**: Large dump files cause memory issues
**Solution**: Process in chunks:

```python
def process_large_dump(file_path, chunk_size=1000):
    """Process large dumps in chunks"""
    with open(file_path, 'r') as f:
        chunk = []
        for line in f:
            chunk.append(line)
            if len(chunk) >= chunk_size:
                process_chunk(chunk)
                chunk = []

        # Process remaining chunk
        if chunk:
            process_chunk(chunk)
```

## Testing Your Conversion

### 1. Validate Record Count

```sql
-- Check record count in your database
SELECT COUNT(*) FROM file_list;

-- Compare with original MySQL count
-- (should match the number you found in Step 1)
```

### 2. Spot Check Data

```sql
-- Check a few sample records
SELECT id, file_no, title, entry_date FROM file_list ORDER BY id LIMIT 5;

-- Verify special characters are handled correctly
SELECT id, title FROM file_list WHERE title LIKE '%special_character%';
```

### 3. Check for Duplicates

```sql
-- Find any duplicate records
SELECT id, COUNT(*) FROM file_list GROUP BY id HAVING COUNT(*) > 1;
```

## Automation Script Template

Create `convert_and_import.sh` for future use:

```bash
#!/bin/bash

# MySQL to PostgreSQL Conversion and Import Script

if [ $# -ne 1 ]; then
    echo "Usage: $0 <mysql_dump.sql>"
    exit 1
fi

DUMP_FILE=$1
LOG_FILE="conversion_$(date +%Y%m%d_%H%M%S).log"

echo "Starting conversion of $DUMP_FILE..." | tee $LOG_FILE

# Step 1: Analyze dump
echo "Step 1: Analyzing dump structure..." | tee -a $LOG_FILE
python3 -c "
import re
with open('$DUMP_FILE', 'r') as f:
    content = f.read()
    print(f'INSERT statements: {len(re.findall(r\"INSERT INTO\", content))}')
    print(f'Data records: {len(re.findall(r\"^\([0-9]+,\", content, re.MULTILINE))}')
" | tee -a $LOG_FILE

# Step 2: Convert
echo "Step 2: Converting to PostgreSQL format..." | tee -a $LOG_FILE
python3 mysql_to_postgres_converter.py $DUMP_FILE | tee -a $LOG_FILE

# Step 3: Verify
echo "Step 3: Verifying conversion..." | tee -a $LOG_FILE
OUTPUT_FILE="${DUMP_FILE%.*}_postgres.sql"
if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ Conversion complete: $OUTPUT_FILE" | tee -a $LOG_FILE
    echo "Records to import: $(grep -c 'INSERT INTO' $OUTPUT_FILE)" | tee -a $LOG_FILE
else
    echo "❌ Conversion failed - output file not found" | tee -a $LOG_FILE
    exit 1
fi

echo "Conversion completed. Check $LOG_FILE for details."
```

## Best Practices

1. **Always backup your database** before importing
2. **Test with a small sample** first
3. **Verify data integrity** after import
4. **Keep conversion logs** for troubleshooting
5. **Use transactions** for large imports
6. **Monitor disk space** during conversion

## Field Mapping Customization

Customize the field mapping in your conversion script based on your table structure:

```python
# Example for different table structures
FIELD_MAPPINGS = {
    'users': {
        'id': 'INTEGER',
        'username': 'TEXT',
        'email': 'TEXT',
        'created_at': 'TIMESTAMP'
    },
    'posts': {
        'id': 'INTEGER',
        'title': 'TEXT',
        'content': 'TEXT',
        'author_id': 'INTEGER',
        'published_at': 'TIMESTAMP'
    }
}
```

## Troubleshooting Checklist

- [ ] File encoding is UTF-8
- [ ] All special characters are properly escaped
- [ ] Date formats are converted correctly
- [ ] Field count matches table schema
- [ ] No syntax errors in generated SQL
- [ ] Database connection is working
- [ ] Sufficient disk space available
- [ ] No conflicting primary keys

---

**Note**: This manual provides a general framework. You may need to customize the parsing logic based on your specific MySQL dump structure and data content.
