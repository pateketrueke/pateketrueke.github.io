---
$render: ../../lib/gh_pages.pug
title: "nixrc: Bringing mIRC Scripts Back to Life in the Browser"
description: "I spent two sessions building a full mIRC script runtime, transpiler, and live playground — from scratch. Here's what it took and why it was worth it."
date: 2026-03-01
icon: bullhorn
---

# nixrc: Bringing mIRC Scripts Back to Life in the Browser

> I spent two sessions building a full mIRC script runtime, transpiler, and live playground — from scratch. Here's what it took and why it was worth it.

## Where It Started: A Coffee Shop in México

My first exposure to mIRC was at a coffee shop. A friend showed me a script called **ToTeX** — a Chilean-made mIRC package from around 2000 — and taught me how to connect to local IRC servers in México. That was it. I was immediately curious: what *is* this thing, and what else can you do with it? The rest is history.

mIRC scripting became one of my first real programming languages. Not in the academic sense — no books, no courses. Just the documentation, the IRC help channels, and a lot of trial and error. The things I learned there shaped how I think about programming: event-driven models, variable scoping, the difference between a command and an identifier, what it means to build something that reacts to user input.

Picture windows were a revelation. The idea that you could open a canvas inside an IRC client and draw GUIs with code — rectangles, text, images, click handlers — felt like magic at the time. And once I learned HTML and CSS, the connection was obvious: this was the same model. A box model. A paint-on-demand loop. I had already internalized it in mIRC before I knew what CSS was.

I remember working out a layout system for picture windows using fractional measurements — something like what CSS Grid does today, but built in `.mrc` in the early 2000s. That work is gone. The internet has nothing cached. The only trace of ToTeX I've found is [a 2007 blogpost listing it among popular mIRC scripts of the era](https://ircayuda.blogspot.com/2007/06/scripts-para-mirc.html).

nixrc is, in part, an attempt to give that work somewhere to live.

## The Problem

mIRC scripts are a relic of the late 90s and early 2000s. The language is quirky, the client is Windows-only, and none of it runs in a browser.

I wanted to fix that. Not just for nostalgia — but because mIRC scripting has a genuinely interesting programming model: events, aliases, picture windows mapped to a Canvas API, a pipe-based command syntax, and a `$identifier` evaluation system that's unlike anything in modern JavaScript. It's worth preserving in a form people can actually run.

The project is called **nixrc**. It started as `mirx` and was renamed on day two.

---

## The Architecture

The plan was three layers: a runtime/interpreter, a transpiler, and a live playground. All three needed to share the same parser.

```
.mrc source
    │
    ├──▶ Interpreter (runtime execution)
    │
    └──▶ Transpiler (emit clean ESM)
              │
              ▼
         nixrc/runtime (stdlib, window manager, event bus)
```

The interpreter is the fast path — parse and run directly in the browser. The transpiler is the "exit ramp from emulation": lower `.mrc` to idiomatic JavaScript once, get native performance and full JS ecosystem interop for free.

Both paths share the same parser. That's the key constraint that kept the design honest.

---

## Day One: Parser, Runtime, Playground

The first session ran from around 9:40 PM to midnight.

### The Parser

mIRC's syntax has a few genuinely tricky parts:

1. **`$identifier` evaluation** — can be nested arbitrarily: `$mid($var,1,3)`
2. **`%var` vs `$var`** — local vs global semantics
3. **`|` as statement separator** — `set %x 5 | echo %x` is two statements
4. **`if (%x > 0) { }` syntax** — not standard C-style; the condition is always in parens
5. **Bracket-space rule** — `[ $var ]` forces evaluation in certain contexts

I wrote it by hand rather than using a PEG library. The tradeoffs were clear: hand-written parsers are verbose but debuggable and fast to iterate on. For a language this quirky, that matters.

The parser emits an AST shared between the interpreter and the code generator.

### The Runtime

The runtime handles:

- Variable store (`%global` and `%local` scopes)
- Alias dispatch
- Built-in identifier evaluation (`$calc`, `$len`, `$mid`, `$upper`, `$rgb`, ...)
- The `WindowManager` — maps `@window` names to `<canvas>` elements
- Draw commands: `/drawrect`, `/drawtext`, `/drawline`, `/drawdot`, `/drawfill`, `/drawpic`
- Event bus for `ON *:EVENT:` handlers and `.timer` callbacks

The first demo: a bouncing ball.

```mirc
alias start {
  window -pz @ball 0 0 400 400
  set %x 50
  set %y 50
  set %dx 3
  set %dy 2
  .timer 0 0 drawframe
}

alias drawframe {
  drawrect -fr @ball $rgb(0,0,0) 0 0 400 400
  drawdot -r @ball $rgb(255,100,0) 8 %x %y
  set %x $calc(%x + %dx)
  set %y $calc(%y + %dy)
  if (%x > 390 || %x < 10) set %dx $calc(%dx * -1)
  if (%y > 390 || %y < 10) set %dy $calc(%dy * -1)
}
```

That ran on the first try. The timer loop, the canvas draw commands, the `$calc` expression evaluator — all wired up in one session.

### The Transpiler

The transpiler lowers mIRC syntax to idiomatic ESM:

```mirc
alias greet {
  echo -a Hello $1 $+ !
}
```
```ts
export function greet(arg1: string) {
  echo({ flags: "-a", text: `Hello ${arg1}!` })
}
```

Variables become `let` declarations. Identifiers become stdlib calls. Events become `addEventListener`-style registrations. The output imports from `nixrc/runtime` — tree-shakeable, works in any ESM environment.

The CLI: `nixrc compile script.mrc --stdout | esbuild --bundle`

Source maps are emitted so browser devtools point back to the original `.mrc` lines.

### The Playground

By midnight: a split-pane editor/output layout. Write mIRC on the left, see picture windows render on the right. Shareable URLs via `#code=<base64url-encoded-script>`. A console panel showing `/echo` output, errors, and event logs.

The bouncing ball example was live. So was the digital clock.

---

## Day Two: Polish, Demos, and the Rename

Day two started at 12:35 AM and ran through the afternoon.

### Parser Improvements

The first task was `if/else/elseif`. mIRC supports several forms:

```mirc
; multi-line
if (%x > 0) {
  echo yes
}
else {
  echo no
}

; single-line, no braces
if (%x > 0) echo yes

; same-line closing brace
} else {
  echo fallback
}
```

All three forms needed to work. The parser was extended to handle multi-line block `else`/`elseif`, single-line `if` without braces, and `} else` / `} elseif` on the same line as a closing brace.

Later: balanced-paren condition parsing to fix a Conway's Life regression where nested parens in `if/elseif` conditions broke the parser.

And: `while (...) {` multiline body support to stop runtime "unsupported command" warnings.

### Math and Time Functions

The analog clock demo needed `$sin`, `$cos`, `$tan`, `$sqrt`, `$abs`, `$int`, `$ctime`, `$time`, `$date`. All added to the interpreter. Fixed inline alias parsing and `echo` output filtering in the same pass.

### Syntax Highlighting (No Dependencies)

The playground editor needed syntax highlighting. The approach: a `pre`/`textarea` overlay hack — no CodeMirror, no external deps.

A regex tokenizer classifies tokens into: comments, `$idents`, `%vars`, keywords, numbers. CSS token variables control the colors. The `pre` element sits behind the `textarea`, always scrolling in sync.

The landing page got the same treatment: static code snippets in pillar cards with token-class markup and a hero typewriter that highlights as it types.

### Example Scripts

Five new demo scripts added to the playground gallery:

- **Paint Canvas** — mouse events, `$mouse.x`/`$mouse.y`, `/drawdot`
- **Conway's Game of Life** — 2D array in `%vars`, large draw loop, `.timer`
- **Regex Tester** — `$regex`, `$regml`, `$rand`
- **IRC Echo Bot stub** — `ON *:TEXT:` event skeleton
- **Flood Fill** — `/drawfill`, click event

Runtime gaps found and filled: mouse events, `$rand`, `/drawfill`, regex/rand support.

### The Canvas Widget Toolkit

Plan 11 was the most ambitious: a two-layer widget toolkit for picture windows.

- **Layer A (geometric)** — rectangles, borders, gradients, text labels, drawn with `/draw*` commands
- **Layer B (drawpic/sprite)** — BMP-tiled skins via `/drawpic` with lazy image caching and sprite-sheet cropping
- **State model** — hash-table per-widget state
- **Event pipeline** — full hover/press/click detection

Then Plan 12: performance. MMOVE RAF throttle (debounce mouse moves to animation frames), drawpic queued replay, cached compiled `$calc`/condition expressions so they're not re-parsed on every frame.

### Fun Scripts: Starfield, Fireworks, Matrix Rain

A catalog of 50 mIRC script ideas, scored and ranked. Top 3 implemented: Starfield, Fireworks, Matrix Rain. All using the canvas draw primitives, timers, and `$rand`.

### GitHub Pages Deploy

Added a GitHub Actions workflow: push to `master` → Vite build → force-push `dist/` to `gh-pages` → live at `play.nixrc.dev`. Playground `base href` switched to `/play/`.

### The Rename

At 9 AM on day two: source rename from `mirx` to `nixrc`. All source files, UI component names (`nixrc-canvas.js`, `nixrc-dialog.js`), class names (`Nixrc`). Tests pass after the rename.

---

## What Works Now

- Parse and execute a meaningful subset of mIRC: aliases, events, variables, if/while/return, timers
- Picture windows rendered on Canvas, with all `/draw*` commands
- Mouse and keyboard events on picture windows
- Syntax highlighting in the playground editor (no deps)
- Shareable URLs for scripts
- Example gallery: bouncing ball, digital clock, paint canvas, Conway's Life, regex tester, flood fill, starfield, fireworks, matrix rain, widget toolkit demo
- `nixrc compile script.mrc` CLI with `--watch`, `--stdout`, `--emit-dts`
- GitHub Actions deploy to `play.nixrc.dev`

---

## What's Next

The remaining gap is IRC bindings — WebSocket-based IRC connections, `ON *:TEXT:*:#` event dispatch, `/msg`, `/join`. That's Phase 5 in the original plan: turning the playground into a live IRC scripting environment.

The transpiler also has room to grow: event blocks (`ON *:TEXT:`), dialog blocks, and full `$+` concatenation lowering are still on the list.

---

*nixrc is a browser-based mIRC script runtime and transpiler. The playground runs at `play.nixrc.dev`. Source is at `nixrc.dev`.*
