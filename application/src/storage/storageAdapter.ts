/**
 * Pluggable Key-Value Storage Adapter
 * Bridges @react-native-async-storage/async-storage with an in-memory fallback
 * for seamless unit testing and decoupled execution.
 */

export interface IStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

class MemoryStorageAdapter implements IStorageAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

let activeAdapter: IStorageAdapter = new MemoryStorageAdapter();

// Detect React Native environment (nativeCallSyncHook or react-native global)
const isReactNative = typeof (global as any).nativeCallSyncHook !== 'undefined' || typeof (global as any).__fbBatchedBridge !== 'undefined';

if (isReactNative) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      activeAdapter = AsyncStorage;
    }
  } catch {
    // Fall back to in-memory adapter
  }
}

export const storage: IStorageAdapter = {
  getItem: (key: string) => activeAdapter.getItem(key),
  setItem: (key: string, value: string) => activeAdapter.setItem(key, value),
  removeItem: (key: string) => activeAdapter.removeItem(key),
  clear: () => activeAdapter.clear(),
};

/** Allows tests to inject an isolated storage adapter */
export function setStorageAdapterForTesting(adapter: IStorageAdapter) {
  activeAdapter = adapter;
}

