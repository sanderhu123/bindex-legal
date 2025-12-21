/**
 * API Performance Monitor (Step 24G)
 * 
 * Monitors and logs API performance metrics
 * Helps identify slow operations and bottlenecks
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  cacheHit: boolean;
}

class ApiMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  /**
   * Record a performance metric
   */
  record(
    operation: string,
    duration: number,
    success: boolean,
    cacheHit: boolean = false
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
      cacheHit,
    };

    this.metrics.push(metric);

    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log performance rating
    const rating = this.getRating(duration);
    const status = success ? '✅' : '❌';
    const cache = cacheHit ? '(cached)' : '';
    
    console.log(
      `[24G-MONITOR] ${status} ${operation} ${cache}: ${duration.toFixed(2)}ms [${rating}]`
    );
  }

  /**
   * Get performance rating based on duration
   */
  private getRating(duration: number): string {
    if (duration < 500) return 'EXCELLENT';
    if (duration < 1500) return 'GOOD';
    if (duration < 3000) return 'ACCEPTABLE';
    if (duration < 5000) return 'SLOW';
    return 'VERY SLOW';
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
    cacheHitRate: number;
  } {
    const filteredMetrics = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        cacheHitRate: 0,
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const successCount = filteredMetrics.filter(m => m.success).length;
    const cacheHitCount = filteredMetrics.filter(m => m.cacheHit).length;

    return {
      count: filteredMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successCount / filteredMetrics.length) * 100,
      cacheHitRate: (cacheHitCount / filteredMetrics.length) * 100,
    };
  }

  /**
   * Get all unique operations
   */
  getOperations(): string[] {
    const operations = new Set(this.metrics.map(m => m.operation));
    return Array.from(operations);
  }

  /**
   * Print performance summary
   */
  printSummary(): void {
    console.log('\n[24G-MONITOR] ========== PERFORMANCE SUMMARY ==========');
    
    const operations = this.getOperations();
    
    if (operations.length === 0) {
      console.log('[24G-MONITOR] No metrics recorded yet');
      console.log('[24G-MONITOR] =======================================\n');
      return;
    }

    for (const operation of operations) {
      const stats = this.getStats(operation);
      console.log(`[24G-MONITOR] ${operation}:`);
      console.log(`  Calls: ${stats.count}`);
      console.log(`  Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
      console.log(`  Min/Max: ${stats.minDuration.toFixed(2)}ms / ${stats.maxDuration.toFixed(2)}ms`);
      console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`  Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);
    }

    console.log('[24G-MONITOR] =======================================\n');
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    console.log('[24G-MONITOR] Metrics cleared');
  }
}

// Export singleton instance
export const apiMonitor = new ApiMonitor();

// Helper function to wrap async operations with monitoring
export async function monitorApiCall<T>(
  operation: string,
  fn: () => Promise<T>,
  isCacheHit: boolean = false
): Promise<T> {
  const startTime = performance.now();
  let success = true;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = performance.now() - startTime;
    apiMonitor.record(operation, duration, success, isCacheHit);
  }
}

