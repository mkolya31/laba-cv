import { readFileSync } from 'node:fs';
const pages = JSON.parse(readFileSync(0, 'utf8'));
const prs = pages.flat();
const sha = process.env.GITHUB_SHA;
const valid = prs.some(
  (pr) =>
    pr.merged_at &&
    pr.base?.ref === 'production' &&
    pr.merge_commit_sha === sha &&
    (pr.head?.ref === 'develop' ||
      /^(release|hotfix)\/.+/.test(pr.head?.ref || '')),
);
if (!valid) {
  console.error(
    'Production commit is not the result of an allowed merged pull request.',
  );
  process.exitCode = 1;
}
