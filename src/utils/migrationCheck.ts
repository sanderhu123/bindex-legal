import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Migration flags stored in AsyncStorage
 */
const MIGRATION_KEYS = {
  PROGRESS_CACHE_V1: 'migration_progress_cache_v1_completed',
};

/**
 * Check if a migration has been completed
 */
export async function isMigrationCompleted(migrationKey: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(migrationKey);
    return value === 'true';
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Mark a migration as completed
 */
export async function markMigrationCompleted(migrationKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(migrationKey, 'true');
    console.log(`✅ Migration marked as completed: ${migrationKey}`);
  } catch (error) {
    console.error('Error marking migration as completed:', error);
  }
}

/**
 * Check if progress cache migration has been completed
 */
export async function isProgressCacheMigrationCompleted(): Promise<boolean> {
  return isMigrationCompleted(MIGRATION_KEYS.PROGRESS_CACHE_V1);
}

/**
 * Mark progress cache migration as completed
 */
export async function markProgressCacheMigrationCompleted(): Promise<void> {
  return markMigrationCompleted(MIGRATION_KEYS.PROGRESS_CACHE_V1);
}

/**
 * Reset migration flags (for testing purposes only)
 */
export async function resetMigrationFlags(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MIGRATION_KEYS.PROGRESS_CACHE_V1);
    console.log('🔄 Migration flags reset');
  } catch (error) {
    console.error('Error resetting migration flags:', error);
  }
}

