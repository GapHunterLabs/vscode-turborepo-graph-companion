# Turborepo Graph Companion (VS Code)

Shows your Turborepo workspace dependency graph as a sidebar tree —
parses `turbo.json`/`package.json` workspaces, no CLI shell-out. No
data leaves your editor.

**v0.1, new niche.** Not a port from the Gap Hunter Labs IntelliJ-
family catalog. Evidence: GitHub Discussion
[`vercel/turborepo#9702`](https://github.com/vercel/turborepo/discussions/9702)
(2025-01-14) — *"add turborepo button to vscode sidebar"*, *"click the
button and open a panel to preview dependency graphs"*, explicitly
comparing against Nx's built-in graph visualization, which Turborepo
doesn't have. Honestly noted: that discussion has 0 recorded
reactions/comments, not a heavily-upvoted issue — what's independently
confirmed is the structural fact that Turborepo genuinely has no
dependency-graph visualization today, unlike Nx.

## What it does

A **Turborepo Graph** view in the Explorer sidebar: reads your root
`package.json`'s `workspaces` field, finds every matching package,
and shows each one's *internal* dependencies (other workspace
packages — not `node_modules`) as an expandable tree, rooted at the
packages nothing else in the workspace depends on (typically your
apps). A circular dependency is shown once, marked `(circular)`,
rather than expanding forever. Refreshes automatically whenever a
`package.json` changes, or on demand via the refresh button in the
view's title bar.

**v0.1 scope, honestly noted:** this is a **tree**, not the visual
node-graph the original discussion pictured — a real interactive
webview graph is a legitimate v2, not built here. `turbo.json`'s own
task pipeline (`build`/`test`/`lint` per package) isn't shown either,
only the package dependency structure itself.

## Privacy

See [PRIVACY.md](PRIVACY.md) — zero network calls, everything runs
against files already in your workspace. No `turbo` CLI is invoked.

## Development

```bash
npm install
npm run compile   # or: npm run watch
npm test
```

To build an installable package without publishing:

```bash
npx @vscode/vsce package
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).
