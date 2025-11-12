/**
 * Utility functions for rate limiting and batching API calls
 */

/**
 * Delays execution for a specified number of milliseconds
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process an array of items in batches with rate limiting
 * @param items - Array of items to process
 * @param batchSize - Number of items to process concurrently
 * @param delayBetweenBatches - Milliseconds to wait between batches
 * @param processFn - Async function to process each item
 * @param onProgress - Optional callback for progress updates
 */
export async function processBatched<T, R>(
  items: T[],
  batchSize: number,
  delayBetweenBatches: number,
  processFn: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number, currentItem: T) => void
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item, batchIndex) => {
      const overallIndex = i + batchIndex;
      if (onProgress) {
        onProgress(overallIndex, items.length, item);
      }
      return processFn(item, overallIndex);
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Extract successful results
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });
    
    // Wait before processing next batch (except for the last batch)
    if (i + batchSize < items.length) {
      await delay(delayBetweenBatches);
    }
  }
  
  return results;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param initialDelay - Initial delay in milliseconds
 * @param maxDelay - Maximum delay between retries
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff
        const delayMs = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
}

/**
 * Rate limiter class for controlling request frequency
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private activeRequests = 0;
  
  constructor(
    private maxConcurrent: number = 3,
    private minInterval: number = 100
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if we're at max concurrent requests
    if (this.activeRequests >= this.maxConcurrent) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    
    this.activeRequests++;
    
    try {
      const result = await fn();
      await delay(this.minInterval);
      return result;
    } finally {
      this.activeRequests--;
      
      // Process next in queue
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

