---
$render: ../../lib/gh_pages.pug
title: "Building a Live-Coding Editor for a Text-Based Music Language"
description: "How a plain textarea became a full syntax-highlighted, tooltip-rich, scrub-to-edit live-coding environment — without CodeMirror, without a framework, and without breaking undo."
date: 2026-03-04
icon: bullhorn
---

# Building a Live-Coding Editor for a Text-Based Music Language

> How a plain textarea became a full syntax-highlighted, tooltip-rich, scrub-to-edit live-coding environment — without CodeMirror, without a framework, and without breaking undo.

## Where This Comes From

I've been investing in tools for live music performance for a while. If you look at [alvadub on GitHub](https://github.com/alvadub) — that's me too. A collection of experiments: MIDI utilities, beat tools, notation drafts. Things I built because I needed them, or because I was trying to understand something.

I got deep into [Strudel](https://strudel.cc) — the browser-based live-coding environment built on Tidal Cycles patterns. I spent time with its API, got familiar with how it handles pattern evaluation, its block-eval shortcuts, how it treats the editor as part of the performance rather than just a text input. It's excellent work.

But it wasn't quite what I wanted. Strudel's model is functional and pattern-oriented — powerful, but not how I think about music when I'm prototyping. I think in tracks, sections, arrangements. I want to write `%bass f#2 c#2 e2` and have it play, not compose a pattern combinator expression. I tried hacking Strudel to fit that model, but you can't bend a system that far without losing the thing that made it good.

So I built my own.

MIDI on SCOOPS has existed for a while as a plain-text music prototyping tool. You write tracks, rhythms, and arrangements in a notation called DUB:

```dub
%bass f#2 c#2 e2 f#2
%chord a3|c#4|f#4

# synth
  @A
    #94 75 x--- --x- ---- ---- %chord

## drums
  @A
    #0 50 x-x- x-x- x-x- x-x-

> A *8
```

Hit play, it loops. Change a note, the loop hot-swaps on the next beat. Simple model.

The original playground was a Svelte component: a `<textarea>` wired to a player. It worked. But it was also a barrier — the notation has seventeen meaningful token types and zero visual feedback. You had to already know what `tok-section`, `tok-mode`, `tok-arrangement`, and `[xx]` meant.

The rewrite was the opportunity to fix that.

---

## The Editor Overlay Pattern

The first decision: no CodeMirror.

CodeMirror is excellent software, but it brings a dependency, a grammar format, and a significant surface area to maintain. The playground is already a tight build with no framework. I wanted to keep it that way.

The alternative is the pre/textarea overlay approach. It's how CodeFlask and Prism Live work. The idea:

- A `<textarea>` handles all input natively — caret, selection, undo/redo, paste, Tab, IME composition. Nothing breaks.
- A `<pre>` sits directly underneath, containing the highlighted HTML. Both share identical `font`, `size`, `padding`, and `line-height`.
- The `textarea` is made transparent (`color: transparent; caret-color: var(--text)`) so only the caret is visible. The colour comes from the `pre`.
- On every `input` event, the `pre` is updated and scroll is synced.

```js
ta.addEventListener('scroll', () => {
  pre.scrollTop = ta.scrollTop;
  pre.scrollLeft = ta.scrollLeft;
});
ta.addEventListener('input', () => {
  pre.innerHTML = highlight(ta.value) + '\n';
});
```

The trailing `'\n'` prevents the last-line cursor from jumping. That's the only trick.

### The Highlighter

`src/highlight.js` reuses the existing `transform()` tokenizer. No extra regex soup — the semantic accuracy comes for free because it's the same code the parser uses.

Seventeen token classes, each with a CSS variable color:

| Token | Class | Color |
|---|---|---|
| `; comment` | `tok-comment` | muted / italic |
| `# track` | `tok-track` | red, bold |
| `@SECTION` | `tok-section` | light blue |
| `> A B C` | `tok-arrangement` | teal |
| `%name` definition | `tok-var-def` | amber |
| `%name` usage | `tok-var-ref` | amber dimmer |
| `x---_x--` | `tok-pattern` | purple |
| `c#4`, `f#2` | `tok-note` | green |
| `a3\|c#4\|f#4` | `tok-chord` | green lighter |
| `phrygian` | `tok-mode` | cyan |

The highlighter runs line-by-line, mirroring the parser's own line dispatch. Each token wraps in `<span class="tok-X" data-*="...">` — the `data-*` attributes are what power the tooltip layer.

---

## The Tooltip System

Once the `pre` layer has semantic spans, mouse events on the transparent `textarea` can hit-test through it:

```js
ta.addEventListener('mousemove', (e) => {
  const els = document.elementsFromPoint(e.clientX, e.clientY);
  const found = els.find(el => el.dataset.instrument
    || el.dataset.mode || el.dataset.note
    || el.dataset.chord || el.dataset.pattern
    || el.dataset.section || el.dataset.var);
  if (found) showTooltip(found, e.clientX, e.clientY);
  else hideTooltip();
});
```

The tooltip system uses a `tooltipHandlers` array — each handler declares which `data-*` attribute it responds to and a resolver function. Adding a new tooltip type is one entry in the array, no other wiring needed.

### What each token tells you

**`#518`** → "Synth Pad 2 (warm)" — resolved from the WebAudioFont loader's `instrumentInfo()` synchronously. Drums use `#2000+N` encoding and resolve via `drumInfo()`.

**`phrygian`** → `H W W W H W W  —  minor with lowered 2nd` — a static lookup table of all seven modes with interval patterns and a description.

**`x---_x--`** → a visual grid showing each rhythmic slot: hit / hold / rest / subdivide. The grid is built from the pattern string itself, one cell per character.

**`@INTRO`** in an arrangement line → the first four non-empty lines of that section block, scanned from the live editor text.

**`c#4`** → `MIDI 61 · 277.2 Hz` — derived from the note name with no external library, plus a `· middle C` annotation for C4.

**`a3|c#4|f#4`** → the chord spelled out as individual notes.

### Staff notation in tooltips

Any token that involves pitched notes gets a treble-clef staff drawn inline as pure SVG — no image, no dependency.

The staff auto-selects the clef based on the average pitch of the notes being shown:

- Low notes (average ≤ −6 from E4) → bass clef `𝄢`
- High notes (average ≥ +2 from E4) → treble clef `𝄞`
- Middle range → C clef `𝄡`

Note positions are calculated from the diatonic position formula:

```js
const DIATONIC = { c:0, d:1, e:2, f:3, g:4, a:5, b:6 };
function noteToPos(noteStr) {
  const m = noteStr.match(/^([a-gA-G])([#b]?)(\d+)$/);
  const diatPos = parseInt(m[3]) * 7 + DIATONIC[m[1].toLowerCase()];
  return diatPos - E4_DIATONIC; // 0 = E4, 2 = G4, 4 = B4 ...
}
```

Ledger lines, stems, accidental symbols, and note stagger for adjacent chord tones are all drawn in the same SVG pass. For mode tooltips, the scale unfolds as seven open hollow note heads spaced across the staff.

---

## Inline Number Scrubbing

Inspired by Bret Victor's "direct manipulation" and Strudel REPL's `slider()` widget: any numeric token in the editor is draggable.

Hover a number like `75` (velocity) or `146` (BPM embedded in a comment) and the cursor changes to `ew-resize`. Click-and-drag left/right to decrement or increment. The change writes directly back into the textarea at the exact character offset, dispatches an `input` event, and the loop hot-swaps on the next beat.

The hard part is finding the character offset of the span within the textarea's plain-text value. The `<pre>` DOM and the textarea value are kept in sync, but the `<pre>` has HTML structure the textarea doesn't know about. The solution: a DOM tree walk that accumulates character counts until it reaches the target span:

```js
function charOffsetOfSpan(preEl, targetSpan) {
  let offset = 0;
  const walker = document.createTreeWalker(preEl, NodeFilter.SHOW_ALL);
  let node;
  while ((node = walker.nextNode())) {
    if (node === targetSpan) return offset;
    if (node.nodeType === Node.TEXT_NODE) offset += node.textContent.length;
  }
  return -1;
}
```

After a plan-22 fix (`join('')` instead of `join('\n')` in the line renderer) introduced a regression where `charOffsetOfSpan` under-counted by one per line, the fix was to add a line-index compensation based on `data-line` attributes. This is the kind of thing that feels obvious in retrospect.

Shift-held scrubs at ×10 speed. Alt-held at ÷10. Velocity values clamp to [1, 127].

---

## Block-Based Evaluation

`Cmd+Shift+Enter` re-evaluates only the block under the cursor, while the rest of the loop keeps playing.

A "block" in DUB is a maximal run of non-blank lines sharing a common owner: a track block starts at `# name`, a section block at `@SECTION`, a variable at `%var`. `src/lib/blocks.js` resolves the cursor position to the enclosing block by scanning backward and forward from the cursor line.

On eval: full document re-parse, diff against the current player state, update only the changed track's beat slots. The loop keeps ticking. Only the affected track changes.

Visual feedback: the evaluated block's lines flash green. The status bar shows `Block: bass` for 1.5 seconds.

---

## Active-Note Highlighting

While the loop plays, the token at the current beat position flashes in the editor. The highlight follows the beat index from the player, with audio-timed callbacks driving the DOM update.

The tricky case: `[xx]` bracket groups. A `[xx]` token is a single beat in the outer pattern, but contains two pulses within it. The active-highlight system detects bracket groups and fires at sub-step intervals — `beat-duration / N` where N is the number of slots inside the brackets.

---

## Section Timeline

The arrangement line `> INTRO *2 A *8` expands into a timeline of section plays. Each unique section token gets a clickable button in a strip below the editor.

- During playback: clicking a section queues it to start at the next loop boundary (`pendingSectionLaunch`).
- While stopped: clicking a section starts playback from that section's beat offset.

The timeline highlights the currently playing section in real time.

---

## What This Adds Up To

The playground went from a textarea-in-a-Svelte-component to:

- Semantic syntax highlighting using the language's own tokenizer
- Tooltips for every meaningful token type — instruments, scales, patterns, sections, notes with staff notation
- Drag-to-scrub for any numeric value, writing back directly into source
- Block evaluation that updates a single track without stopping the loop
- Active-note flashing synced to the audio clock, bracket-aware
- Section timeline with click-to-jump navigation

No CodeMirror. No framework. Zero new runtime dependencies.

---

*MIDI on SCOOPS is a plain-text DUB music prototyping tool. Try it live at [m0s.soypache.co](https://m0s.soypache.co).*
