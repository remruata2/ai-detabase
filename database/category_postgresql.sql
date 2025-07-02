-- PostgreSQL version of category dump
-- Converted from MySQL dump

-- Create table with PostgreSQL-compatible syntax
CREATE TABLE IF NOT EXISTS category_list (
  id SERIAL PRIMARY KEY,
  file_no VARCHAR(50) NOT NULL,
  category VARCHAR(220) NOT NULL
);

-- Insert data (keeping first 50 entries as example)
INSERT INTO category_list (id, file_no, category) VALUES
(1, 'MSB/CB/A-1', 'DSI Corrrespondence'),
(2, 'MSB/CB/A-3/3(A)', 'Sinlung Hills Development Council/All Party Leaders Committee(APLC)/SHC'),
(3, 'MSB/CB/A-4', 'Detection and Deportation of Foreigner'),
(4, 'MSB/CB/A-5', 'Indo-Myanmar Border Affairs(Intelligence)'),
(5, 'MSB/CB/A-7', 'Enquiry against Police Officers & men'),
(6, 'MSB/CB/A-8', 'Election Commission/Central Election'),
(7, 'MSB/CB/A-9', 'Communal Riot, etc'),
(8, 'MSB/CB/A-10', 'Kidnapping/Abduction'),
(9, 'MSB/CB/A-11', 'Sensitive/Hyper Sensitive pockets'),
(10, 'MSB/CB/A-13', 'Law and Order'),
(11, 'MSB/CB/A-14', 'Security threat perception transfer to B-19(A)'),
(12, 'MSB/CB/A-19', 'Meeting of DGP/IGP/DIG/SP/Governor Confidential Report'),
(13, 'MSB/CB/A-20(A)', 'Explosive recoveries/Bomb Explosion (Monthly Return)'),
(14, 'MSB/CB/A-21', 'Mizoram-Manipur Border/Paite Refugee'),
(15, 'MSB/CB/A-23', 'Press clipping'),
(16, 'MSB/CB/A-24', 'Detailment Order'),
(17, 'MSB/CB/A-25', 'Vanawia Group (Closed)'),
(18, 'MSB/CB/A-27', 'News Letter (Mizoram Police)'),
(19, 'MSB/CB/A-29', 'Operation party killed 4(four) at Tipaimukh'),
(20, 'MSB/CB/A-34', 'Bangladesh Rifles Activities/BGB'),
(21, 'MSB/CB/A-35', 'Myanmar/Bangladesh Border Incident'),
(22, 'MSB/CB/A-37', 'Lengpui Airport Corr. tranfer to D-2(A)'),
(23, 'MSB/CB/A-40', 'Special Task Force Corr. (Joint Task Force on Intl.) JTFI'),
(24, 'MSB/CB/A-41', 'Indo Bangladesh Affairs'),
(25, 'MSB/CB/A-42(B)', 'Vehicle/Highway Robbery/Gold Bar'),
(26, 'MSB/CB/A-43', 'Union Public Service Commission(UPSC) Examination affairs'),
(27, 'MSB/CB/A-45', 'All India Security Suspected (AISS)'),
(28, 'MSB/CB/A-46', 'RAP/ILP'),
(29, 'MSB/CB/A-50', 'AR Incident'),
(30, 'MSB/CB/A-51', 'Misunderstanding between AR/CID(SB)/MRP/Civilian');

-- Note: This is a truncated version showing the PostgreSQL conversion
-- To import all data, you'll need to convert the full MySQL dump 