import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const sha = '1234567890';
const pr = {
  merged_at: '2026-01-01T00:00:00Z',
  merge_commit_sha: sha,
  base: { ref: 'production' },
  head: { ref: 'develop' },
};

function check(pages) {
  return spawnSync(process.execPath, ['scripts/check-production-merge.mjs'], {
    input: JSON.stringify(pages),
    env: { ...process.env, GITHUB_SHA: sha },
  }).status;
}

test('accepts only the exact merge commit of an allowed production PR', () => {
  for (const ref of ['develop', 'release/1.0', 'hotfix/issue']) {
    assert.equal(check([[{ ...pr, head: { ref } }]]), 0);
  }
  for (const candidate of [
    { ...pr, merged_at: null },
    { ...pr, merge_commit_sha: 'other' },
    { ...pr, base: { ref: 'main' } },
    { ...pr, head: { ref: 'main' } },
    { ...pr, head: { ref: 'release/' } },
  ]) {
    assert.notEqual(check([[candidate]]), 0);
  }
  assert.notEqual(check([[]]), 0);
});
