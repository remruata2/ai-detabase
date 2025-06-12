#!/usr/bin/env python3
"""
Complete MySQL to PostgreSQL Import - All 15 Records
Handles all records from the MySQL dump properly
"""

import re
import subprocess
import tempfile
import os

def parse_mysql_dump_complete(file_path):
    """Parse the MySQL dump with all individual INSERT statements"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by INSERT INTO and process each section
    sections = content.split('INSERT INTO `file_list`')
    
    records = []
    record_ids = []
    
    print(f"Found {len(sections)-1} INSERT statements to process")
    
    for i, section in enumerate(sections[1:], 1):  # Skip first empty section
        print(f"Processing INSERT statement {i}")
        
        # Extract VALUES content
        values_match = re.search(r'VALUES\s*\((.*?)\);', section, re.DOTALL)
        if not values_match:
            print(f"  No VALUES found in section {i}")
            continue
            
        values_content = values_match.group(1)
        
        # Extract record ID (first field)
        id_match = re.match(r'\s*(\d+)', values_content)
        if id_match:
            record_id = int(id_match.group(1))
            record_ids.append(record_id)
            print(f"  Found record ID: {record_id}")
            
            # Parse the complete record
            record = parse_values_content(values_content, record_id)
            if record:
                records.append(record)
                print(f"  Successfully parsed record {record_id}")
            else:
                print(f"  Failed to parse record {record_id}")
        else:
            print(f"  No ID found in section {i}")
    
    print(f"\nParsed {len(records)} records: {sorted(record_ids)}")
    return records

def parse_values_content(values_str, record_id):
    """Parse a VALUES clause content into a record"""
    
    try:
        # Clean up the values string
        values_str = values_str.strip()
        if values_str.endswith(','):
            values_str = values_str[:-1]
        
        # Use a simple field extraction approach
        fields = extract_fields_simple(values_str)
        
        if len(fields) >= 14:  # Should have at least 14 fields
            return {
                'id': record_id,
                'file_no': clean_field(fields[1]),
                'category': clean_field(fields[2]),
                'title': clean_field(fields[3]),
                'note': clean_field(fields[4]),
                'doc1': clean_field(fields[5]),
                'doc2': clean_field(fields[6]),
                'doc3': clean_field(fields[7]),
                'doc4': clean_field(fields[8]),
                'doc5': clean_field(fields[9]),
                'doc6': clean_field(fields[10]),
                'entry_date': clean_field(fields[11]),
                'entry_date_real': clean_field(fields[12]),
                'note_plain_text': clean_field(fields[13]) if len(fields) > 13 else ''
            }
        else:
            print(f"  Record {record_id} has only {len(fields)} fields, expected 14")
            return None
            
    except Exception as e:
        print(f"  Error parsing record {record_id}: {e}")
        return None

def extract_fields_simple(values_str):
    """Simple field extraction using basic parsing"""
    
    fields = []
    current_field = ""
    in_quotes = False
    quote_char = None
    i = 0
    
    while i < len(values_str):
        char = values_str[i]
        
        if not in_quotes:
            if char in ["'", '"']:
                in_quotes = True
                quote_char = char
                current_field = ""
            elif char == ',':
                fields.append(current_field.strip())
                current_field = ""
            else:
                current_field += char
        else:
            if char == quote_char:
                # Check for escaped quote
                if i + 1 < len(values_str) and values_str[i + 1] == quote_char:
                    current_field += char
                    i += 1  # Skip next quote
                else:
                    in_quotes = False
                    quote_char = None
            else:
                current_field += char
                
        i += 1
    
    # Add last field
    if current_field.strip():
        fields.append(current_field.strip())
    
    return fields

def clean_field(field):
    """Clean a field value"""
    if not field:
        return ''
    
    field = field.strip()
    
    # Remove quotes if present
    if (field.startswith("'") and field.endswith("'")) or \
       (field.startswith('"') and field.endswith('"')):
        field = field[1:-1]
    
    # Handle NULL
    if field.upper() == 'NULL':
        return ''
    
    # Unescape quotes
    field = field.replace("''", "'").replace('""', '"')
    field = field.replace("\\'", "'").replace('\\"', '"')
    
    return field

def create_insert_sql(record):
    """Create PostgreSQL INSERT statement for a record"""
    
    # Escape single quotes for PostgreSQL
    def escape_sql(value):
        if not value:
            return ''
        return value.replace("'", "''")
    
    return f"""
INSERT INTO "file_list" (
    "id", "file_no", "category", "title", "note",
    "doc1", "doc2", "doc3", "doc4", "doc5", "doc6",
    "entry_date", "entry_date_real", "note_plain_text"
) VALUES (
    {record['id']}, 
    '{escape_sql(record['file_no'])}', 
    '{escape_sql(record['category'])}', 
    '{escape_sql(record['title'])}',
    '{escape_sql(record['note'])}',
    '{escape_sql(record['doc1'])}', 
    '{escape_sql(record['doc2'])}', 
    '{escape_sql(record['doc3'])}', 
    '{escape_sql(record['doc4'])}', 
    '{escape_sql(record['doc5'])}', 
    '{escape_sql(record['doc6'])}',
    '{escape_sql(record['entry_date'])}', 
    '{escape_sql(record['entry_date_real'])}',
    '{escape_sql(record['note_plain_text'])}'
) ON CONFLICT (id) DO NOTHING;"""

def main():
    input_file = 'sample_data.sql'
    
    print("=" * 60)
    print("Complete MySQL to PostgreSQL Import - All Records")
    print("=" * 60)
    
    # Parse all records
    records = parse_mysql_dump_complete(input_file)
    
    if not records:
        print("No records found to import!")
        return
    
    print(f"\nCreating SQL file for {len(records)} records...")
    
    # Create complete SQL file
    sql_content = "-- Complete PostgreSQL import for all MySQL records\n\n"
    
    for record in records:
        sql_content += create_insert_sql(record) + "\n"
    
    # Write to file
    output_file = 'complete_all_records.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    
    print(f"SQL file created: {output_file}")
    
    # Import via Prisma
    print(f"\nImporting {len(records)} records via Prisma...")
    
    try:
        result = subprocess.run([
            'npx', 'prisma', 'db', 'execute', 
            '--file', output_file,
            '--schema', 'prisma/schema.prisma'
        ], capture_output=True, text=True, check=True)
        
        print("✅ All records imported successfully!")
        print(f"Records imported: {[r['id'] for r in records]}")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Import failed: {e}")
        print(f"Error output: {e.stderr}")
        return False
    
    return True

if __name__ == "__main__":
    main() 