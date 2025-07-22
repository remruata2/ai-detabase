-- Add content_format column to file_list table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'file_list'
        AND column_name = 'content_format'
    ) THEN
        ALTER TABLE file_list ADD COLUMN content_format VARCHAR(20);
    END IF;
END $$;

-- Update all existing records to set content_format to 'markdown'
UPDATE file_list
SET content_format = 'markdown'
WHERE content_format IS NULL;

-- Verify the update
SELECT COUNT(*) as total_records, 
       COUNT(CASE WHEN content_format = 'markdown' THEN 1 END) as records_with_markdown
FROM file_list;
