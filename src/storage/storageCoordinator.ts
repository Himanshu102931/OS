/**
 * Storage Coordinator for PlacementOS
 *
 * Provides concurrency coordination abstractions for cross-tab persistence.
 * Evaluates the browser's Web Locks API (`navigator.locks`) where available,
 * serializing primary-state mutations through a single named exclusive lock.
 *
 * Concurrency Guarantees & Fallback Behavior:
 * - With Web Locks (`navigator.locks` supported):
 *   Guarantees strict mutual exclusion across separate browser tabs and contexts
 *   during the complete read-check-increment-write critical section.
 * - Without Web Locks (Fallback mode / unsupported environments):
 *   Guarantees synchronous event-loop execution safety within a single JS context,
 *   coupled with monotonic revision checks. Because localStorage operations are
 *   synchronous within a thread, optimistic revision checks catch conflicts prior
 *   to writing, but cannot provide kernel-level mutual exclusion if two tabs execute
 *   their synchronous read-check-write at the exact same instant across OS processes.
 */

export const STORAGE_LOCK_NAME = 'placementos_v1_storage_lock';

export interface StorageSaveResult {
  success: boolean;
  conflict: boolean;
  persistedRevision?: number;
  error?: 'quota_exceeded' | 'conflict' | 'storage_unavailable' | 'unknown';
}

export const StorageCoordinator = {
  /**
   * Returns true if Web Locks API (`navigator.locks.request`) is available in the current environment.
   */
  isWebLocksSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      Boolean(navigator.locks) &&
      typeof navigator.locks.request === 'function'
    );
  },

  /**
   * Serializes an asynchronous storage operation using the Web Locks API
   * when supported by the browser, falling back to direct execution otherwise.
   *
   * @param lockName Name of the exclusive lock (defaults to `STORAGE_LOCK_NAME`)
   * @param operation Synchronous or asynchronous operation to execute within the lock
   */
  async withLock<T>(
    lockName: string = STORAGE_LOCK_NAME,
    operation: () => Promise<T> | T
  ): Promise<T> {
    if (this.isWebLocksSupported()) {
      return navigator.locks.request(lockName, async () => {
        return operation();
      });
    }
    return operation();
  },
};

