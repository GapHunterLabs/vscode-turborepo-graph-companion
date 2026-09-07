import * as vscode from 'vscode';
import { WorkspacePackage, buildGraph, findRoots, matchesAnyWorkspaceGlob } from './workspaceGraph';

class GraphNode extends vscode.TreeItem {
  constructor(
    public readonly packageName: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly ancestors: readonly string[],
  ) {
    super(packageName, collapsibleState);
  }
}

class TurborepoGraphProvider implements vscode.TreeDataProvider<GraphNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private graph = new Map<string, string[]>();
  private roots: string[] = [];

  refresh(graph: Map<string, string[]>): void {
    this.graph = graph;
    this.roots = findRoots(graph);
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: GraphNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GraphNode): GraphNode[] {
    if (!element) {
      return this.roots.map((name) => this.makeNode(name, []));
    }
    const deps = this.graph.get(element.packageName) ?? [];
    return deps.map((name) => {
      if (element.ancestors.includes(name) || name === element.packageName) {
        // Cycle -- show it without recursing infinitely into it.
        const node = new GraphNode(`${name} (circular)`, vscode.TreeItemCollapsibleState.None, []);
        return node;
      }
      return this.makeNode(name, [...element.ancestors, element.packageName]);
    });
  }

  private makeNode(name: string, ancestors: string[]): GraphNode {
    const hasChildren = (this.graph.get(name) ?? []).length > 0;
    const state = hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
    return new GraphNode(name, state, ancestors);
  }
}

async function readJsonIfExists(uri: vscode.Uri): Promise<unknown> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    return null;
  }
}

function readWorkspaceGlobs(rootPackageJson: unknown): string[] {
  if (typeof rootPackageJson !== 'object' || rootPackageJson === null) return [];
  const workspaces = (rootPackageJson as Record<string, unknown>).workspaces;
  if (Array.isArray(workspaces)) return workspaces.filter((w): w is string => typeof w === 'string');
  if (typeof workspaces === 'object' && workspaces !== null) {
    const packages = (workspaces as Record<string, unknown>).packages;
    if (Array.isArray(packages)) return packages.filter((w): w is string => typeof w === 'string');
  }
  return [];
}

function dependencyNamesOf(packageJson: unknown): string[] {
  if (typeof packageJson !== 'object' || packageJson === null) return [];
  const obj = packageJson as Record<string, unknown>;
  const names = new Set<string>();
  for (const field of ['dependencies', 'devDependencies']) {
    const section = obj[field];
    if (typeof section === 'object' && section !== null) {
      for (const name of Object.keys(section)) names.add(name);
    }
  }
  return [...names];
}

async function loadWorkspacePackages(root: vscode.Uri): Promise<WorkspacePackage[]> {
  const rootPackageJson = await readJsonIfExists(vscode.Uri.joinPath(root, 'package.json'));
  const globs = readWorkspaceGlobs(rootPackageJson);
  if (globs.length === 0) return [];

  const files = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 2000);
  const packages: WorkspacePackage[] = [];

  for (const uri of files) {
    const dirPath = vscode.workspace.asRelativePath(vscode.Uri.joinPath(uri, '..'), false);
    if (dirPath === '.' || dirPath === '') continue; // the root package.json itself
    if (!matchesAnyWorkspaceGlob(globs, dirPath)) continue;

    const packageJson = await readJsonIfExists(uri);
    if (typeof packageJson !== 'object' || packageJson === null) continue;
    const name = (packageJson as Record<string, unknown>).name;
    if (typeof name !== 'string') continue;

    packages.push({ name, dir: dirPath, dependencyNames: dependencyNamesOf(packageJson) });
  }

  return packages;
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new TurborepoGraphProvider();
  const treeView = vscode.window.createTreeView('turborepoGraphCompanion.graph', { treeDataProvider: provider });
  context.subscriptions.push(treeView);

  async function refresh(): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return;
    const packages = await loadWorkspacePackages(folders[0].uri);
    provider.refresh(buildGraph(packages));
  }

  void refresh();

  const watcher = vscode.workspace.createFileSystemWatcher('**/package.json');
  context.subscriptions.push(
    watcher,
    watcher.onDidChange(() => void refresh()),
    watcher.onDidCreate(() => void refresh()),
    watcher.onDidDelete(() => void refresh()),
    vscode.commands.registerCommand('turborepoGraphCompanion.refresh', () => void refresh()),
  );
}

export function deactivate(): void {
  // no resources to release beyond what's registered in subscriptions
}
