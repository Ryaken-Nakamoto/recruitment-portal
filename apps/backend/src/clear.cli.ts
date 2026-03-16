import 'reflect-metadata';
import AppDataSource from './data-source';

async function clearAllData() {
  // Check for --force flag
  const hasForceFlag = process.argv.includes('--force');

  if (!hasForceFlag) {
    console.error('❌ ERROR: --force flag is required to clear all data');
    console.error('Usage: npm run clear-all-data -- --force');
    process.exit(1);
  }

  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connected');

    // Get all tables
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // Get list of all tables
    const tables = await queryRunner.getTables();

    // Disable foreign key constraints temporarily
    await queryRunner.query('SET CONSTRAINTS ALL DEFERRED;');

    // Truncate all tables
    for (const table of tables) {
      console.log(`Clearing table: ${table.name}`);
      await queryRunner.query(
        `TRUNCATE TABLE "${table.name}" RESTART IDENTITY CASCADE;`,
      );
    }

    // Re-enable foreign key constraints
    await queryRunner.query('SET CONSTRAINTS ALL IMMEDIATE;');

    console.log('✅ All data cleared successfully');

    await queryRunner.release();
  } catch (error) {
    console.error('❌ Clear failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

clearAllData();
