import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceGlobToRegExp, matchesAnyWorkspaceGlob, buildGraph, findRoots } from '../workspaceGraph';

test('workspaceGlobToRegExp matches a single-level star glob', () => {
  const re = workspaceGlobToRegExp('apps/*');
  assert.equal(re.test('apps/web'), true);
  assert.equal(re.test('apps/web/src'), false);
  assert.equal(re.test('packages/ui'), false);
});

test('workspaceGlobToRegExp matches a ** glob at any depth', () => {
  const re = workspaceGlobToRegExp('packages/**');
  assert.equal(re.test('packages/ui'), true);
  assert.equal(re.test('packages/ui/button'), true);
});

test('matchesAnyWorkspaceGlob checks against a list of globs', () => {
  const globs = ['apps/*', 'packages/*'];
  assert.equal(matchesAnyWorkspaceGlob(globs, 'apps/web'), true);
  assert.equal(matchesAnyWorkspaceGlob(globs, 'packages/ui'), true);
  assert.equal(matchesAnyWorkspaceGlob(globs, 'tools/scripts'), false);
});

test('buildGraph keeps only internal (workspace) dependencies', () => {
  const packages = [
    { name: 'web', dir: 'apps/web', dependencyNames: ['ui', 'react'] },
    { name: 'ui', dir: 'packages/ui', dependencyNames: ['react'] },
  ];
  const graph = buildGraph(packages);
  assert.deepEqual(graph.get('web'), ['ui']);
  assert.deepEqual(graph.get('ui'), []);
});

test('buildGraph excludes a self-dependency', () => {
  const packages = [{ name: 'web', dir: 'apps/web', dependencyNames: ['web'] }];
  const graph = buildGraph(packages);
  assert.deepEqual(graph.get('web'), []);
});

test('findRoots returns packages nothing else depends on', () => {
  const graph = new Map([
    ['web', ['ui']],
    ['ui', []],
  ]);
  assert.deepEqual(findRoots(graph), ['web']);
});

test('findRoots falls back to every package when the graph is fully cyclic', () => {
  const graph = new Map([
    ['a', ['b']],
    ['b', ['a']],
  ]);
  assert.deepEqual(findRoots(graph).sort(), ['a', 'b']);
});
