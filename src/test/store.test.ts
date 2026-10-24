import { describe, expect, it } from 'vitest';
import { clean, newId } from '../lib/store/backend';
import { LocalBackend, MemoryStorage } from '../lib/store/local';

describe('device store', () => {
  it('saves straight away and tells listeners', async () => {
    const b = new LocalBackend('t', new MemoryStorage());
    const seen: number[] = [];
    const stop = b.listen<{ id: string }>('entries', (items) => seen.push(items.length));
    await b.save('entries', { id: 'a' });
    await b.save('entries', { id: 'b' });
    await b.save('entries', { id: 'a' });
    await b.remove('entries', 'b');
    stop();
    expect(seen).toEqual([0, 1, 2, 2, 1]);
  });

  it('keeps docs and can dump and clear', async () => {
    const s = new MemoryStorage();
    const b = new LocalBackend('t', s);
    await b.saveDoc('about', { sections: { a: 'x' } });
    await b.save('checkins', { id: 'c', level: 2 });
    const dump = b.dump(['checkins', 'doc:about']);
    expect(dump['doc:about']).toEqual({ sections: { a: 'x' } });
    b.clear(['checkins', 'doc:about']);
    expect(b.dump(['checkins'])['checkins']).toBeNull();
  });

  it('drops undefined fields so both stores match', () => {
    expect(clean({ a: 1, b: undefined })).toEqual({ a: 1 });
    expect(newId()).toMatch(/^[0-9a-z]{16}$/);
  });
});
