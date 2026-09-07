/**
 * Pure logic -- no `vscode` dependency. New niche (not a port from
 * the Kotlin catalog). Evidence: GitHub Discussion
 * `vercel/turborepo#9702` (2025-01-14) -- "add turborepo button to
 * vscode sidebar", "click the button and open a panel to preview
 * dependency graphs" -- explicitly requesting parity with Nx's
 * built-in graph visualization, which Turborepo doesn't have.
 */

export interface WorkspacePackage {
  name: string;
  dir: string; // workspace-relative directory
  dependencyNames: string[]; // combined dependencies + devDependencies, unfiltered
}

/** Converts an npm/yarn/pnpm `workspaces` glob (the common single-`*`
 * "one level of directories" shape, and `**` for arbitrary depth) to
 * a RegExp matched against a workspace-relative directory path. */
export function workspaceGlobToRegExp(glob: string): RegExp {
  const escaped = glob
    .split('')
    .map((ch) => (/[.+^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch))
    .join('')
    .replace(/\*\*/g, ' WILD ')
    .replace(/\*/g, '[^/]*')
    .replace(/ WILD /g, '.*');
  return new RegExp(`^${escaped}$`);
}

export function matchesAnyWorkspaceGlob(globs: string[], dirPath: string): boolean {
  return globs.some((glob) => workspaceGlobToRegExp(glob).test(dirPath));
}

/** Builds the internal dependency graph: for each workspace package,
 * which OTHER workspace packages does it depend on (its own
 * dependencies filtered down to names that are themselves workspace
 * packages -- an external npm dependency like "react" is not part of
 * this graph). */
export function buildGraph(packages: WorkspacePackage[]): Map<string, string[]> {
  const namesInWorkspace = new Set(packages.map((p) => p.name));
  const graph = new Map<string, string[]>();
  for (const pkg of packages) {
    const internalDeps = pkg.dependencyNames.filter((dep) => namesInWorkspace.has(dep) && dep !== pkg.name);
    graph.set(pkg.name, internalDeps);
  }
  return graph;
}

/** Packages nothing in the workspace depends on -- natural roots for
 * a tree display (typically apps, as opposed to shared packages/*
 * libraries that only appear as children). Falls back to every
 * package if the graph is fully cyclic (no package has zero
 * dependents) rather than showing an empty tree. */
export function findRoots(graph: Map<string, string[]>): string[] {
  const hasDependent = new Set<string>();
  for (const deps of graph.values()) {
    for (const dep of deps) hasDependent.add(dep);
  }
  const roots = [...graph.keys()].filter((name) => !hasDependent.has(name));
  return roots.length > 0 ? roots : [...graph.keys()];
}
