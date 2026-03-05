---
$render: ../../lib/gh_pages.pug
title: "From Toy to Toolchain: What We Shipped in One 10x Session"
description: "One overnight session. One custom language. A compiler, a CSS system, a Vite plugin, an LSP server, a Tree-sitter grammar, a Zed extension, and a new landing page. Here's what a..."
date: 2026-02-19
icon: bullhorn
---

# From Toy to Toolchain: What We Shipped in One 10x Session

> One overnight session. One custom language. A compiler, a CSS system, a Vite plugin, an LSP server, a Tree-sitter grammar, a Zed extension, and a new landing page. Here's what actually happened.

## The Setup

10x is a custom language that lives in `.md` files. Programs are markdown documents. The language has its own scanner, parser, and eval — a toy interpreter written in JavaScript.

It started as an exercise from [Crafting Interpreters](https://craftinginterpreters.com/) — Robert Nystrom's web-book on building languages from scratch. I wanted to understand how interpreters actually work, so I built one. The format — markdown as source code — came from years of using CoffeeScript and eventually discovering that `.coffee.md` was a thing. I was working at Grupo Expansión when I first encountered literate programming. I didn't know it had a name. I just thought it was interesting that you could write prose and code in the same file, and that the prose wasn't just comments — it was part of the program.

Until yesterday, 10x was mostly what it started as: a toy.

The goal for this session was to close the gap between "it runs in the browser demo" and "it works as a real toolchain." That meant a compiler, proper module support, CSS, and everything a modern frontend project expects.

We shipped all of it. Here's how.

---

> *There's a gap between understanding how something works and building something real with it. Most side projects live in that gap indefinitely. The compiler was about finally crossing it.*

## Part 1: The Compiler

The interpreter evaluates 10x source at runtime. That's fine for demos, but it means you can't ship compiled output. The first task was a real `compile` command.

The key design decision: compiled output should be portable ESM — no bundler required, no runtime magic. The `runtimePath` option lets you point compiled modules at any runtime location:

```sh
10x compile examples/todolist.md --runtime ./runtime
# → emits: import * as Runtime from "./runtime";
```

Prose paragraphs in the source get emitted as JS comments. So literate-style `.md` programs compile to self-documenting JS files. That's a consequence of the format, not a feature we had to design.

Module bundling came next. `compileBundle()` resolves `@import ... @from "./..."` dependencies, builds a topological dependency graph, strips module export wrappers, and outputs a single JS file. Aliased imports (`--alias @app=/path/to/app`) let you bundle across package boundaries:

```sh
10x compile main.md --bundle --alias "@app=/tmp/tenx-app"
```

The bundler test: compile a two-module app, pipe to bun, get the right answer. 21 tests passing.

---

## Part 2: CSS (And Shipping a Dependency Mid-Session)

The CSS design had three modes:

1. **`@style` with a raw string** — inline styles, shadow-aware
2. **`@style` with an object** — converted to CSS at runtime
3. **Compile-time atomic utilities** — Tailwind-like class generation, zero config

Mode 3 is the interesting one: 10x does not scan `@style` blocks for utilities. Instead, at compile time it scans `class` attributes, extracts utility class names, generates a `<style>` tag, and injects it automatically.

While planning the CSS system, we did a full audit of the `somedom` API — the vdom library 10x uses for rendering. We were using three exports: `h`, `mount`, `patch`. Somedom had about 50. Including a full compile-time CSS scoping pipeline (`rulify`, `specify`, `cssify`) — but only in a version that didn't exist yet.

So we shipped `somedom` v0.9.1 mid-session. Moved SSR CSS helpers into the docs, bumped the version, pushed the tag, published the GitHub release. Then updated 10x to depend on it.

That unblocked CSS scoping for SSR too.

---

## Part 3: Unlocking somedom

The API audit revealed something bigger than CSS. There was a whole signal system in somedom we weren't using: `d:*` directives (`d:show`, `d:model`, `d:click-outside`), `s:propName` signal bindings, `class:name`/`style:prop` conditional bindings, `ref` for DOM element access, `computed()`, `batch()`, `untracked()`.

None of it worked in 10x because the compiler was wrapping every attribute value in `Runtime.read()` — which resolved signals eagerly before somedom could see them.

The fix was a single compiler change: for `d:*`, `s:*`, `class:*`, `style:*`, and `ref` attributes in `@html` tags, pass signal objects through directly instead of resolving them.

One compiler pass. Unlocked the entire signal directive system.

We also added `.value` getter/setter compatibility so 10x signals pass somedom's `isSignal()` check. And `@computed` support in the compiler — `Runtime.computed(() => expr)` for derived values.

27 tests passing after this batch.

---

## Part 4: The Tooling Ecosystem

A language without tooling is a toy. The plan: Vite plugin, DevTools overlay, LSP server, Tree-sitter grammar, Zed extension — all in one session.

The Vite plugin now handles:

- `runtimePath` configuration
- `include`/`exclude` filtering
- UnoCSS/Tailwind opt-in (`tenx({ atomicCss: false })`) — disables 10x built-in atomic CSS so projects can use UnoCSS or Tailwind via their own setup
- HMR enabled by default

HMR was its own task. The design: two-tier preservation.

**Signal state**: `import.meta.hot.dispose` snapshots named signal values before module teardown. `accept` restores them after re-exec. State survives hot reloads.

**Web components**: `globalThis.__10x_components` registry maps module URLs to active host elements. On HMR accept, the plugin re-clears each shadow DOM and re-calls `setup(host)` on live instances. Components update without losing DOM position.

The compiler emits the HMR footer when `hmr: true`. The Vite plugin passes that flag automatically.

The LSP server scaffolds diagnostic output from parse/compile errors and hover preview of compiled JS. The Tree-sitter grammar covers directives, tags, definitions, and expressions. The Zed extension wires the local grammar to the built LSP command.

All of this runs. There's a smoke script that validates end-to-end toolchain wiring.

---

## Part 5: The Editor and the Landing Page

The `<x-editor>` custom element is a contenteditable live coding environment. It evaluates code as you type, renders result anchors inline, and handles syntax highlighting.

Today's fixes were all about display quality:

- **HTML tag/attribute highlighting** — the scanner emits entire HTML markup blocks as a single token. A new `tokenizeHtml()` micro-lexer splits them into sub-tokens and renders them with 7 new CSS classes (`xt-html-punct`, `xt-html-tag`, `xt-html-attr`, `xt-html-value`, etc.)
- **Semantic result compaction** — anchor results now branch on type: records show key names only (`{ name age email }`), lists show preview + count (`[ 1 2 3 … 10 items ]`), tags show tag name (`<div …>`)
- **Unit display** — standalone unit literals (`2cm`) now bootstrap the Unit conversion helper in the evaluator env, so unit expressions render results correctly

The landing page went through three versions. v2 replaced external links with overlay dialogs. v3 scrapped the card grid entirely for an alternating editorial layout — "Literate Dark" — with 5 live `<x-editor>` instances, a pipeline visualization, and a tabbed demo section.

---

## What This Adds Up To

One session, roughly midnight to 11am. Here's the list of things that exist now that didn't exist yesterday:

- A real `compile` CLI command with portable ESM output
- A module bundler with alias support
- Three-mode CSS system with compile-time atomic utilities
- Full signal directive support via somedom integration
- `@computed` bindings
- Vite plugin with HMR, UnoCSS/Tailwind opt-in, include/exclude
- LSP server scaffold with diagnostics and hover
- Tree-sitter grammar + Zed extension
- A DevTools overlay wired to the signal registry
- HTML tag/attribute syntax highlighting in x-editor
- Semantic result compaction in x-editor
- A new dark literate landing page
- A published somedom v0.9.1 that unlocked all of the above

None of this was designed upfront. The session started with "close a few TASKS.md items" and ended with a compiler, a CSS system, and a full toolchain.

That's the nature of building infrastructure: each piece unlocks the next one.

---

> *None of this happens in a straight line. I take notes in spare moments, sit down after work to plan with Claude, then hand the implementation to Codex. Claude has good taste — it knows what a product should feel like. Codex is a teammate who executes. Between the two, things get done.*
>
> *This is what happens when inspiration, tools, and spare time meet.*

---

_10x is an ongoing experiment in literate programming and custom language design. These posts document what gets built and why._
