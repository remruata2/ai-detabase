#!/usr/bin/env python3
"""
Final Complete MySQL to PostgreSQL Data Import
Handles multiple INSERT statements properly
"""

import re
import subprocess
import sys
import os

def parse_mysql_dump(file_path):
    """Parse the MySQL dump with multiple INSERT statements"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all INSERT statements
    insert_pattern = r"INSERT INTO `file_list`[^;]*VALUES\s*\((.*?)\);"
    insert_matches = re.findall(insert_pattern, content, re.DOTALL)
    
    print(f"Found {len(insert_matches)} INSERT statements")
    
    records = []
    
    for i, values_str in enumerate(insert_matches):
        try:
            record = parse_single_record(values_str)
            if record:
                records.append(record)
                print(f"✅ Parsed record {i+1}: ID {record['id']}, File: {record['file_no']}")
            else:
                print(f"❌ Failed to parse record {i+1}")
        except Exception as e:
            print(f"❌ Error parsing record {i+1}: {e}")
            continue
    
    return records

def parse_single_record(values_str):
    """Parse a single record's VALUES content"""
    
    # Split by comma but handle quoted strings
    values = []
    current_value = ""
    in_string = False
    quote_char = None
    escape_next = False
    
    for char in values_str:
        if escape_next:
            current_value += char
            escape_next = False
            continue
            
        if char == '\\' and in_string:
            current_value += char
            escape_next = True
            continue
            
        if not in_string:
            if char in ("'", '"'):
                in_string = True
                quote_char = char
                current_value += char
            elif char == ',':
                values.append(current_value.strip())
                current_value = ""
                continue
            else:
                current_value += char
        else:
            if char == quote_char:
                in_string = False
                quote_char = None
            current_value += char
    
    # Add the last value
    if current_value.strip():
        values.append(current_value.strip())
    
    if len(values) < 14:
        print(f"Warning: Record has only {len(values)} values, expected 14")
        # Pad with empty strings
        while len(values) < 14:
            values.append("''")
    
    # Clean values
    def clean_value(val):
        val = val.strip()
        if val == 'NULL':
            return ''
        if val.startswith("'") and val.endswith("'"):
            # Remove outer quotes and unescape
            inner = val[1:-1]
            inner = inner.replace("\\'", "'")
            inner = inner.replace('\\"', '"')
            inner = inner.replace("\\\\", "\\")
            inner = inner.replace("\\r\\n", "\n")
            inner = inner.replace("\\n", "\n")
            inner = inner.replace("\\t", "\t")
            return inner
        return val
    
    try:
        record = {
            'id': int(clean_value(values[0])),
            'file_no': clean_value(values[1]),
            'category': clean_value(values[2]), 
            'title': clean_value(values[3]),
            'note': clean_value(values[4]),
            'doc1': clean_value(values[5]),
            'doc2': clean_value(values[6]),
            'doc3': clean_value(values[7]),
            'doc4': clean_value(values[8]),
            'doc5': clean_value(values[9]),
            'doc6': clean_value(values[10]),
            'entry_date': clean_value(values[11]),
            'entry_date_real': clean_value(values[12]),
            'note_plain_text': clean_value(values[13])
        }
        return record
    except (ValueError, IndexError) as e:
        print(f"Error creating record: {e}")
        print(f"Values: {[v[:50] + '...' if len(v) > 50 else v for v in values[:5]]}")
        return None

def create_sql_import(records, output_file):
    """Create a SQL file for importing the records"""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Complete PostgreSQL import for MySQL sample data\n")
        f.write(f"-- Converting {len(records)} records\n\n")
        
        for record in records:
            # Escape single quotes in content
            def escape_sql(value):
                if not value:
                    return ''
                return value.replace("'", "''")
            
            f.write(f"-- Record ID: {record['id']}\n")
            f.write(f"INSERT INTO \"file_list\" (\n")
            f.write(f"    \"id\", \"file_no\", \"category\", \"title\", \"note\",\n")
            f.write(f"    \"doc1\", \"doc2\", \"doc3\", \"doc4\", \"doc5\", \"doc6\",\n")
            f.write(f"    \"entry_date\", \"entry_date_real\", \"note_plain_text\"\n")
            f.write(f") VALUES (\n")
            f.write(f"    {record['id']},\n")
            f.write(f"    '{escape_sql(record['file_no'])}',\n")
            f.write(f"    '{escape_sql(record['category'])}',\n")
            f.write(f"    '{escape_sql(record['title'])}',\n")
            f.write(f"    '{escape_sql(record['note'])}',\n")
            f.write(f"    '{escape_sql(record['doc1'])}',\n")
            f.write(f"    '{escape_sql(record['doc2'])}',\n")
            f.write(f"    '{escape_sql(record['doc3'])}',\n")
            f.write(f"    '{escape_sql(record['doc4'])}',\n")
            f.write(f"    '{escape_sql(record['doc5'])}',\n")
            f.write(f"    '{escape_sql(record['doc6'])}',\n")
            f.write(f"    '{escape_sql(record['entry_date'])}',\n")
            f.write(f"    '{escape_sql(record['entry_date_real'])}',\n")
            f.write(f"    '{escape_sql(record['note_plain_text'])}'\n")
            f.write(f") ON CONFLICT (id) DO NOTHING;\n\n")
        
        # Update search vectors
        ids = [str(r['id']) for r in records]
        f.write("-- Update search vectors for full-text search\n")
        f.write("UPDATE file_list\n")
        f.write("SET search_vector = to_tsvector('english',\n")
        f.write("    COALESCE(file_no, '') || ' ' ||\n")
        f.write("    COALESCE(category, '') || ' ' ||\n") 
        f.write("    COALESCE(title, '') || ' ' ||\n")
        f.write("    COALESCE(note_plain_text, '')\n")
        f.write(")\n")
        f.write(f"WHERE id IN ({', '.join(ids)});\n")

def import_via_prisma(sql_file):
    """Import the SQL file via Prisma"""
    try:
        result = subprocess.run([
            'npx', 'prisma', 'db', 'execute', 
            '--file', sql_file,
            '--schema', 'prisma/schema.prisma'
        ], capture_output=True, text=True, check=True)
        
        print("✅ Data imported successfully via Prisma!")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error importing data: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False

def main():
    input_file = "sample_data.sql"
    
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found!")
        sys.exit(1)
    
    print("🔄 Parsing MySQL dump with multiple INSERT statements...")
    records = parse_mysql_dump(input_file)
    
    if not records:
        print("❌ No records found to import!")
        sys.exit(1)
    
    print(f"📋 Found {len(records)} records to import")
    
    # Create SQL file
    sql_output = "final_complete_import.sql"
    print(f"📝 Creating SQL import file: {sql_output}")
    create_sql_import(records, sql_output)
    
    # Import via Prisma
    print("🚀 Importing data via Prisma...")
    success = import_via_prisma(sql_output)
    
    if success:
        print("🎉 MySQL data successfully converted and imported to PostgreSQL!")
        print(f"📊 Imported {len(records)} records")
        
        # Show imported record IDs
        record_ids = [r['id'] for r in records]
        print(f"📋 Record IDs imported: {sorted(record_ids)}")
        
        print(f"✨ SQL file saved as: {sql_output}")
    else:
        print("💥 Import failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 