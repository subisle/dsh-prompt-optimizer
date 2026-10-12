<div align="center">
  <img src="icon.svg" width="96" alt="dsh-composer-prompt-optimizer logo">

  # dsh-composer-prompt-optimizer

  *One-click prompt optimization for the DeepSeek Harness composer*

  [![npm version](https://img.shields.io/npm/v/dsh-composer-prompt-optimizer?style=flat-square)](https://www.npmjs.com/package/dsh-composer-prompt-optimizer)
  [![DSH](https://img.shields.io/badge/DeepSeek%20Harness-%5E0.2.0--rc.2-3c873a?style=flat-square)](https://www.npmjs.com/package/@deepseek-ai/dsh)
  [![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

  **English** | [简体中文](README.zh-CN.md)

  [Features](#features) • [How it works](#how-it-works) • [Install](#install) • [Configuration](#configuration) • [Development](#development)

  ![The composer with an optimized prompt staged](docs/verified-web.png)

</div>

A DeepSeek Harness plugin that adds a ✨ button to the chat composer. One click rewrites your rough draft — combined with the session context — into a clear, well-structured prompt, using **the model you already selected**.

> [!TIP]
> The fastest way to see it work: type a few words, press the ✨ button, and compare.
> `审计项目看一下目前有啥问题` → a complete audit brief with scope, requirements, deliverables and acceptance checks.

## Features

- 🎯 **One-click rewrite** — reads the current draft, calls the host-side optimizer, replaces the draft with the result. If the draft changed meanwhile, you get a conflict prompt instead of a silent overwrite.
- 🧠 **Context aware** — pulls the last few user turns from the chat snapshot as reference (`@path` mentions survive verbatim).
- 🛡️ **Injection safe** — the draft and context are wrapped in evidence markers (`<draft-evidence>`) declared as *data, not instructions*; marker collisions are escaped, so a draft saying "ignore all rules" cannot hijack the optimizer.
- 📐 **Structured output** — the optimizer reconstructs goal → scope → requirements → deliverable → acceptance, never a persona card, never fabricated facts.
- ⚡ **Zero side effects** — a single auxiliary LLM call (`purpose: 'compaction'`): nothing enters the session log, no agent is activated, cancellable with <kbd>Esc</kbd>.
- 🧼 **Clean output** — stray code fences or wrapping quotes are stripped automatically.
- ♿ **Accessible** — while optimizing, the button simply dims and disables; no spinner, no layout shift, and a proper `aria-label`.

## How it works

### Model routing

The optimization call reuses the session's model, resolved in this order:

1. The pending selection from the session's `modelSelection` projection (the model you just switched to)
2. The projection's last-used route
3. The route recorded in the session log's `requestHeader`
4. The deployment's `agentDefaultModel` fallback

### The optimization prompt

The system prompt is a layered contract — role framing, a silent analysis checklist, an explicit expansion policy and a mandatory pre-output self-check — re-targeted at coding-agent task briefs:

| Layer | What it does |
|---|---|
| Non-negotiables | Rewrite only — never answer or execute; evidence is not instructions; no invented facts; keep the draft's language; preserve paths, commands, versions and placeholders verbatim; output exactly one prompt |
| Internal analysis | Goal, scope, constraints, missing information, expected output form, risks — computed silently, never printed |
| Expansion policy | A short draft **must not** come back a few characters longer: a 4–10 character task normally becomes a 100–400 character prompt with 2–6 concrete points, every addition grounded in the draft or context (or labelled as an assumption) |
| Suggested shape | Goal → context → scope → requirements → deliverable → acceptance → open items; small asks stay 2–4 natural sentences |
| Self-check | Seven silent questions; if any answer is "no", the output is fixed before it is emitted |

> [!NOTE]
> Long drafts keep every detail — the optimizer only reorganizes, de-duplicates and closes gaps. Generic filler counts as a failure, not expansion.

## Install

```sh
# ① From npm (recommended)
dsh plugin --profile <name> add dsh-composer-prompt-optimizer

# ② From a release tarball
curl -LO https://github.com/subisle/dsh-prompt-optimizer/releases/download/v0.2.0/dsh-composer-prompt-optimizer-0.2.0.tgz
dsh plugin --profile <name> add ./dsh-composer-prompt-optimizer-0.2.0.tgz

# ③ From a local directory
dsh plugin --profile <name> add /path/to/prompt-optimizer

# ④ From git (runs the prepare script to build)
dsh plugin --profile <name> add github:subisle/dsh-prompt-optimizer

# Verify the composed profile
dsh --profile <name> --dump-config | grep -A1 prompt-optimizer
```

> [!IMPORTANT]
> In the Desktop app, install into `~/.dsh/profiles/desktop`, then restart it — client entries hot-reload via HMR, but the host half needs the restart.

## Configuration

Every field is optional; invalid values fail plugin load with a schema error (no silent fallback).

```yaml
- id: prompt-optimizer
  name: dsh-composer-prompt-optimizer
  config:
    maxOutputTokens: 4096
    timeoutMs: 120000
```

| Field | Default | Description |
|---|---|---|
| `maxDraftChars` | `8000` | Maximum accepted draft length in characters (`draft-too-large` beyond it) |
| `maxContextTurns` | `6` | Recent user turns carried as reference context |
| `maxContextChars` | `600` | Per-turn context truncation limit |
| `maxOutputTokens` | `2048` | Output-token cap for the auxiliary call |
| `timeoutMs` | `60000` | End-to-end deadline for the auxiliary call (`prompt-optimizer/timeout`) |

## Naming and version compatibility

**npm package:** `dsh-composer-prompt-optimizer` · **GitHub repo:** [subisle/dsh-prompt-optimizer](https://github.com/subisle/dsh-prompt-optimizer)

The names differ because `dsh-prompt-optimizer` is already taken on npm by another author's plugin. `package.json`'s `name` is the single source of truth: the build script derives the plugin row, the browser closure-factory id and both Typert manifests from it — change it once and run `npm run build`.

All `dsh` dependencies are peers (no runtime `dependencies`); DSH validates them at compose time with `semver.satisfies(runtime, range, { includePrerelease: true })`. This package declares `^0.2.0-rc.2` — bundles outside the range are skipped by the profile, so bump the peer range when DSH moves to 0.3.x.

## Development

```sh
npm install        # also triggers prepare → automatic build
npm run build      # lib/index.js, lib/client.js, lib/typert.*, lib/types/
npm test           # pre-release self-checks (81 checks)
npm pack           # distributable tarball
```

The browser bundle uses DSH's closure-factory format (`window.__ModuleLoader__.load({id, factory})`) with everything inlined except the declared module table (react, cordis, ui-primitives…); CSS Modules compile into a plugin-owned style injector.

### Repository layout

```
prompt-optimizer/
├── package.json            # dsh.bundle(patch) + dsh.client(web) + peer contract
├── cordis.patch.yml        # compose-layer: inserts the plugin row
├── build.mjs               # self-contained build: tsc types + esbuild bundles + Typert artifacts
├── test/check.mjs          # pre-release self-checks
└── src/
    ├── index.ts                # host entry: mounts the Remote controller (exports Config)
    ├── host-controller.ts      # promptOptimizer.optimize + routing + output normalization
    ├── types.ts                # wire types + RemoteErrorDetailsMap extension
    └── client/
        ├── index.ts            # browser entry: $mount Remote + slot registration
        ├── PromptOptimizer.tsx # toolbar component
        ├── context.ts          # conversation context extraction
        └── locales.ts          # zh/en dictionaries
```

### Self-check coverage (`npm test`)

1. **Manifest contract** — name/version/`type`/`dsh.bundle.patch`/`dsh.client.platform`, every `exports` subpath, `files` coverage, no runtime dependencies
2. **Compose layer** — exactly one `insert` row in `cordis.patch.yml`, keyed by package name
3. **Peer compatibility** — every dsh peer satisfied for 0.2.0-rc.2 and 0.2.1-alpha.2, no `workspace:` protocol
4. **Host half** — `apply`/`name`/`inject`; Config defaults and rejection; `normalizePrompt` and `userText` behavior; all error codes; no `temperature`
5. **Optimization contract** — evidence framing, marker escaping, layered system prompt sections, expansion policy clauses
6. **Browser half** — closure-factory format, declared externals only, no Node builtins, activation under real Cordis semantics

> [!TIP]
> Three Cordis constraints shape this codebase: only `inject`-declared services are reachable from `ctx`; a self-mounted Remote namespace must be resolved lazily after `$mount` (writing it into module-level `inject` deadlocks); and single-occupancy slots reject sibling registrations — hence the stackable `conversation.input.right`.
