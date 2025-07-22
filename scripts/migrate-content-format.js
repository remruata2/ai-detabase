// Script to add content_format column and update existing records
const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const prisma = new PrismaClient();

async function runSqlScript() {
  console.log('Running SQL migration script...');
  const sqlScript = fs.readFileSync(
    path.join(__dirname, 'add_content_format_column.sql'),
    'utf8'
  );
  
  try {
    // Execute the SQL script using psql (you'll need to provide connection details)
    console.log('To run the SQL script manually, use:');
    console.log('psql -U your_username -d your_database -f scripts/add_content_format_column.sql');
    
    console.log('\nAlternatively, you can copy and run these SQL commands in your database client:');
    console.log(sqlScript);
  } catch (error) {
    console.error('Error running SQL script:', error);
  }
}

async function updateRecordsProgrammatically() {
  console.log('\nUpdating records programmatically using Prisma...');
  
  try {
    // Check if the column exists by attempting a query
    try {
      await prisma.$queryRaw`SELECT content_format FROM file_list LIMIT 1`;
      console.log('Column content_format exists in the database.');
    } catch (error) {
      console.error('Column content_format does not exist. Please run the SQL migration first.');
      return;
    }
    
    // Count records
    const totalRecords = await prisma.fileList.count();
    console.log(`Total records in file_list: ${totalRecords}`);
    
    // Update all records to set content_format to 'markdown'
    const updateResult = await prisma.fileList.updateMany({
      where: {
        content_format: null
      },
      data: {
        content_format: 'markdown'
      }
    });
    
    console.log(`Updated ${updateResult.count} records to have content_format = 'markdown'`);
    
    // Verify the update
    const verifyResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total_records, 
             COUNT(CASE WHEN content_format = 'markdown' THEN 1 END) as records_with_markdown
      FROM file_list
    `;
    
    console.log('Verification results:');
    console.log(verifyResult[0]);
    
  } catch (error) {
    console.error('Error updating records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('=== Content Format Migration Script ===');
  await runSqlScript();
  await updateRecordsProgrammatically();
  console.log('\nMigration process completed.');
}

main()
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
