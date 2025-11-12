/**
 * Tests for rate limiting utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { delay, processBatched, retryWithBackoff, RateLimiter } from '../rateLimit';

describe('rateLimit utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('delay', () => {
    it('should delay execution by specified milliseconds', async () => {
      const start = Date.now();
      await delay(100);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(90); // Allow small variance
    });
  });

  describe('processBatched', () => {
    it('should process items in batches', async () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      const processedItems: number[] = [];
      
      await processBatched(
        items,
        3, // Batch size
        50, // Delay between batches
        async (item) => {
          processedItems.push(item);
          return item * 2;
        }
      );
      
      expect(processedItems).toHaveLength(10);
      expect(processedItems).toEqual(items);
    });

    it('should call progress callback', async () => {
      const items = [1, 2, 3, 4, 5];
      const progressCalls: number[] = [];
      
      await processBatched(
        items,
        2,
        10,
        async (item) => item,
        (completed) => {
          progressCalls.push(completed);
        }
      );
      
      expect(progressCalls.length).toBeGreaterThan(0);
    });

    it('should handle failures gracefully', async () => {
      const items = [1, 2, 3, 4, 5];
      let successCount = 0;
      
      const results = await processBatched(
        items,
        2,
        10,
        async (item) => {
          if (item === 3) {
            throw new Error('Test error');
          }
          successCount++;
          return item;
        }
      );
      
      // Should process 4 items successfully (excluding item 3)
      expect(successCount).toBe(4);
      expect(results).toHaveLength(4);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(fn, 3, 100);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });
      
      const result = await retryWithBackoff(fn, 3, 50);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Permanent failure'));
      
      await expect(retryWithBackoff(fn, 3, 50)).rejects.toThrow('Permanent failure');
      expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('RateLimiter', () => {
    it('should limit concurrent executions', async () => {
      const limiter = new RateLimiter(2, 50); // Max 2 concurrent
      let currentConcurrent = 0;
      let maxConcurrent = 0;
      
      const fn = async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await delay(100);
        currentConcurrent--;
        return 'done';
      };
      
      const promises = Array.from({ length: 5 }, () => limiter.execute(fn));
      await Promise.all(promises);
      
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should respect minimum interval', async () => {
      const limiter = new RateLimiter(1, 100);
      const timestamps: number[] = [];
      
      const fn = async () => {
        timestamps.push(Date.now());
        return 'done';
      };
      
      await Promise.all([
        limiter.execute(fn),
        limiter.execute(fn),
        limiter.execute(fn),
      ]);
      
      // Check intervals between executions
      for (let i = 1; i < timestamps.length; i++) {
        const interval = timestamps[i] - timestamps[i - 1];
        expect(interval).toBeGreaterThanOrEqual(90); // Allow small variance
      }
    });
  });
});

