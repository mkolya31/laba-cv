import { realpath, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  atomicJSON,
  optional,
  compare,
  withLock,
  currentId,
  inspectRelease,
  publishAssets,
  switchTo,
  verifyRelease,
} from './release-files.mjs';
export { withLock, currentId, inspectRelease } from './release-files.mjs';
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const assertSameRun = (previous, id, state, info) => {
  if (previous !== id || state.highwater.sha !== info.meta.sha)
    throw new Error('Run already published; explicit rollback required');
};
const alreadyPublished = async ({
  id,
  mode,
  state,
  previous,
  info,
  origin,
}) => {
  if (mode === 'bootstrap' && previous)
    throw new Error('Bootstrap requires no current release');
  if (mode === 'rollback' && !state.successful.some((item) => item.id === id))
    throw new Error('Rollback target was not published');
  if (mode !== 'rollback' && state.highwater) {
    const order = compare(info.meta, state.highwater);
    if (order < 0) throw new Error('Stale CI run');
    if (order === 0) {
      assertSameRun(previous, id, state, info);
      await verifyRelease(info, origin);
      return true;
    }
  }
  return false;
};
const restorePrevious = async ({
  base,
  previous,
  origin,
  statePath,
  committed,
  error,
}) => {
  try {
    await switchTo(base, previous);
    if (previous)
      await verifyRelease(await inspectRelease(base, previous), origin);
    await atomicJSON(statePath, committed);
  } catch {
    throw new Error('Rollback failed: operator intervention required', {
      cause: error,
    });
  }
};
export const activate = async ({
  base,
  id,
  mode = 'activate',
  origin = 'https://dev.kolyach.me',
}) => {
  base = await realpath(base);
  return withLock(base, async () => {
    const statePath = resolve(base, '.state/releases.json');
    const state = (await optional(() => json(statePath))) || {
      highwater: null,
      successful: [],
    };
    if (state.pending)
      throw new Error('Unfinished publication: operator recovery required');
    const previous = await currentId(base);
    const info = await inspectRelease(base, id);
    if (
      await alreadyPublished({ base, id, mode, state, previous, info, origin })
    )
      return;
    await publishAssets(info);
    const committed = structuredClone(state);
    state.pending = { previous, next: id };
    await atomicJSON(statePath, state);
    await switchTo(base, id);
    try {
      await verifyRelease(info, origin);
      if (mode !== 'rollback') state.highwater = info.meta;
      state.successful = [
        { id, ...info.meta },
        ...state.successful.filter((item) => item.id !== id),
      ];
      delete state.pending;
      await atomicJSON(statePath, state);
    } catch (error) {
      await restorePrevious({
        base,
        previous,
        origin,
        statePath,
        committed,
        error,
      });
      throw new Error(
        previous
          ? 'Publication failed; previous release restored'
          : 'First publication failed; disable only the new virtual host',
        { cause: error },
      );
    }
  });
};

export const cleanup = async (base) => {
  base = await realpath(base);
  return withLock(base, async () => {
    const path = resolve(base, '.state/releases.json');
    const state = await json(path);
    if (state.pending) throw new Error('Recover unfinished publication first');
    const current = await currentId(base);
    const history = [...state.successful].sort((a, b) => compare(b, a));
    const keep = new Set(history.slice(0, 5).map((item) => item.id));
    keep.add(current);
    const removed = [];
    for (const item of history.filter((item) => !keep.has(item.id))) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,159}$/.test(item.id))
        throw new Error('Invalid cleanup id');
      const directory = resolve(base, 'releases', item.id);
      const actual = await optional(() => realpath(directory));
      if (actual && actual !== directory)
        throw new Error('Cleanup symlink prohibited');
      await rm(directory, { recursive: true, force: true });
      removed.push(item.id);
    }
    state.successful = state.successful.filter(
      (item) => !removed.includes(item.id),
    );
    await atomicJSON(path, state);
    return removed;
  });
};
export const recover = async (base, origin = 'https://dev.kolyach.me') => {
  base = await realpath(base);
  return withLock(base, async () => {
    const path = resolve(base, '.state/releases.json');
    const state = await json(path);
    if (!state.pending) throw new Error('No unfinished publication');
    const previous = state.pending.previous;
    if (previous) await inspectRelease(base, previous);
    await optional(() => switchTo(base, previous));
    if (previous)
      await verifyRelease(await inspectRelease(base, previous), origin);
    delete state.pending;
    await atomicJSON(path, state);
    if (!previous)
      throw new Error('No predecessor: disable only the new virtual host');
  });
};
