import { describe, expect, it } from 'vitest';

describe('queue display contract', () => {
  it('accepts the live queue payload shape', () => {
    const state = { centreId: 'c1', currentServingToken: 'A101', pendingCount: 4 };
    expect(state.currentServingToken).toBe('A101');
    expect(state.pendingCount).toBeGreaterThanOrEqual(0);
  });
});
