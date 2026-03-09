import { describe, it, expect, beforeEach } from 'vitest';
import { createStorageService } from './storage';

describe('StorageService', () => {
  let storage: ReturnType<typeof createStorageService>;

  beforeEach(() => {
    localStorage.clear();
    storage = createStorageService();
  });

  it('get returns null when key missing', async () => {
    expect(await storage.get('missing')).toBe(null);
  });

  it('set and get round-trip', async () => {
    await storage.set('k', { a: 1 });
    expect(await storage.get<{ a: number }>('k')).toEqual({ a: 1 });
  });

  it('remove deletes key', async () => {
    await storage.set('k', 1);
    await storage.remove('k');
    expect(await storage.get('k')).toBe(null);
  });

  it('keys returns only prefixed keys', async () => {
    await storage.set('a', 1);
    await storage.set('b', 2);
    const k = await storage.keys();
    expect(k).toContain('a');
    expect(k).toContain('b');
    expect(k.length).toBe(2);
  });

  it('keys with prefix filter', async () => {
    await storage.set('red:1', 1);
    await storage.set('red:2', 2);
    await storage.set('blue:1', 3);
    const redKeys = await storage.keys('red');
    expect(redKeys).toHaveLength(2);
    expect(redKeys).toContain('red:1');
    expect(redKeys).toContain('red:2');
  });
});
