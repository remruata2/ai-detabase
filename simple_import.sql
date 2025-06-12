-- Simple PostgreSQL import for MySQL sample data
-- Manually cleaned and simplified

BEGIN;

-- Insert record 5
INSERT INTO "file_list" (
    "id", "file_no", "category", "title", "note",
    "doc1", "doc2", "doc3", "doc4", "doc5", "doc6",
    "entry_date", "entry_date_real", "note_plain_text"
) VALUES (
    5, 
    'MSB/CB/B-85/Arms', 
    'Arms, Smuggling etc.', 
    'ARMS RECOVERED',
    E'<p><span style="font-size:12pt"><strong><span style="font-size:16.0pt"><span style="color:black">II. ARMS RECOVERED:</span></span></strong></span></p>',
    '', '', '', '', '', '', 
    '31/05/2007', 
    '2007-05-31',
    'II. ARMS RECOVERED: This is a detailed report about arms recovered by CID(SB) during operations.'
) ON CONFLICT (id) DO NOTHING;

-- Insert record 6  
INSERT INTO "file_list" (
    "id", "file_no", "category", "title", "note",
    "doc1", "doc2", "doc3", "doc4", "doc5", "doc6", 
    "entry_date", "entry_date_real", "note_plain_text"
) VALUES (
    6,
    'MSB/CB/A-84',
    'Achievements of CID(SB)',
    'CID(SB) ACHIEVEMENTS DURING 2009 AS ON 30.7.09.',
    E'<p style="text-align:center"><span style="font-size:12pt"><strong>CID(SB) ACHIEVEMENTS DURING 2009 AS ON 30.7.09.</strong></span></p>',
    '', '', '', '', '', '',
    '30/07/2009',
    '2009-07-30', 
    'CID(SB) ACHIEVEMENTS DURING 2009 AS ON 30.7.09. - Summary of achievements and activities during 2009'
) ON CONFLICT (id) DO NOTHING;

-- Insert record 12
INSERT INTO "file_list" (
    "id", "file_no", "category", "title", "note",
    "doc1", "doc2", "doc3", "doc4", "doc5", "doc6",
    "entry_date", "entry_date_real", "note_plain_text"  
) VALUES (
    12,
    'MSB/CB/B-159(A)',
    'Govt servant involved into business',
    'Parawise Comment on WP (C) 5958/2009 Team Life Core Insurance (India Pvt. Ltd.-VS-Union of India & ORS',
    E'<p style="text-align:center"><span style="font-size:12pt"><strong><span style="font-size:16.0pt">OFFICE OF THE SUPERINTENDENT OF POLICE</span></strong></span></p>',
    '', '', '', '', '', '',
    '01/01/2009',
    '2009-01-01',
    'OFFICE OF THE SUPERINTENDENT OF POLICE CID (SB) - Parawise comments on legal case regarding insurance matter'
) ON CONFLICT (id) DO NOTHING;

-- Update sequence to avoid conflicts
SELECT setval('file_list_id_seq', (SELECT COALESCE(MAX(id), 1) FROM file_list), true);

-- Update search vectors for full-text search
UPDATE file_list 
SET search_vector = to_tsvector('english',
    COALESCE(file_no, '') || ' ' ||
    COALESCE(category, '') || ' ' ||
    COALESCE(title, '') || ' ' ||
    COALESCE(note_plain_text, '')
)
WHERE id IN (5, 6, 12);

COMMIT;

\echo 'Sample data import completed successfully!'; 