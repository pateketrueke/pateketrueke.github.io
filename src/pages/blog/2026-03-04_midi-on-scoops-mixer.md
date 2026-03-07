---
$render: ../../lib/gh_pages.pug
title: "Turning a MIDI Toy into a DUB Machine: The Mixer"
description: "DUB music is the mixer. The engineer riding the faders and delay sends between sections *is* the instrument. So why did MIDI on SCOOPS ship without one?"
date: 2026-03-04
icon: bullhorn
---

# Turning a MIDI Toy into a DUB Machine: The Mixer

> DUB music is the mixer. The engineer riding the faders and delay sends between sections *is* the instrument. So why did MIDI on SCOOPS ship without one?

*This is part two of a series on MIDI on SCOOPS. [Part one covers the editor](./midi-on-scoops-editor.md) — syntax highlighting, tooltips, number scrubbing, and live block evaluation. This post covers the audio engine.*

I've been building tools for live music performance for a while — MIDI utilities, beat sequencers, notation drafts, under [alvadub on GitHub](https://github.com/alvadub). MIDI on SCOOPS is the one that got serious. The goal was always a DUB prototyping environment I could actually perform with, not just export MIDI from.

DUB is a genre where the mix *is* the composition. The engineer who drops the bass out between sections, pushes the delay send on the snare during a breakdown, rides the reverb on a synth pad through a transition — that person is as much the author of the music as the person who wrote the notes. You can't capture that with a single signal path.

## The Original Audio Graph

The original player had a flat signal chain:

```
all tracks → equalizer.input → echo.input → output.gain → destination
```

Every track went through the same EQ and echo bus. No per-track control. No mute, no solo, no send levels. The whole mix was one knob.

That works for prototyping a melody. It doesn't work for DUB.

In DUB, the engineer drops out the bass between sections. Swings the delay send up on the snare. Rides the reverb on a synth pad through a transition. The mix *is* the arrangement. None of that was possible when every track shared a single signal path.

The rewrite gave every track its own gain chain.

---

## The New Audio Graph

```
Track "bass"    → dryGain[bass]    ────────────────────────────┐
                → reverbSend[bass] → reverbBus → reverb        │
                → delaySend[bass]  → delayBus  → delay  ──→ masterGain → out
                                                                │
Track "synth"   → dryGain[synth]   ─────────────────────────────┤
                → reverbSend[synth] → reverbBus                 │
                → delaySend[synth]  → delayBus                  │
                                                                 │
               reverb.output ───────────────────────────────────┤
               delay feedback ──────────────────────────────────┘
```

Three `GainNode`s per track:

- **`dry`** — volume fader. Mute = set to 0.
- **`reverbSend`** — how much of this track feeds the shared reverb bus.
- **`delaySend`** — how much feeds the shared delay bus.

The reverb and delay buses both feed `masterGain`, so their wet signal is still subject to global output volume.

Routing the new graph required refactoring `preload()`. The flat `beats[i] = [drums, notes]` structure had no track identity — everything was anonymous. `preload()` was rewritten to preserve track keys so each beat tick can be routed to its own gain chain. That single structural change is what made everything else possible.

---

## The Delay Bus

A BPM-synced delay is the defining sound of DUB. The delay time is computed from the current tempo:

```js
const beatDuration = 60 / bpm; // seconds per beat
delayNode.delayTime.value = beatDuration * delayBeats; // e.g. 0.5 = eighth-note delay
```

The delay bus has a feedback path: a `GainNode` between the delay output and input, set to something like 0.35. Each echo is quieter than the last. The mixer exposes the feedback amount as a slider so you can push it toward infinite repeat during a breakdown.

Tap tempo syncs the delay time to a live tap — useful when loading a preset that was written without a `; tempo:` comment in the header.

---

## The Mixer Panel

The mixer renders as a two-column rack-style panel. Each track gets a strip:

- Track name (truncated with ellipsis; native `title` tooltip shows the full name)
- Mute / Solo buttons
- Volume fader
- Reverb send
- Delay send
- Beat activity indicator — flashes when the track fires

The activity indicators run off the same `playBeatAt()` hook that drives the editor's active-note highlighting. No separate polling loop.

The sampler section spans both columns: 10 pads, each with a draggable sample slot. Pads fire on click or MIDI note-on. Four additional synthesized defaults fill empty slots on first load.

---

## MIDI Learn

Every meaningful control in the mixer — faders, sends, pad triggers, transport buttons — has a `data-midiId` attribute. Assigning a hardware controller to any of them takes two steps:

1. Hold the `L` key.
2. Click the control.

While `L` is held, all learnable controls show `Learn` text and a highlight. Releasing `L` restores them. When a control is in learn mode and a MIDI CC message arrives, the mapping is stored.

```js
midiAccess.on('message', (msg) => {
  if (midiLearnKeyHeld && activeLearningControl) {
    midiLearn.assign(activeLearningControl.dataset.midiId, msgNorm(msg));
    return;
  }
  // normal dispatch
  const action = midiLearn.lookup(msgNorm(msg));
  if (action) buildMidiActions()[action]?.();
});
```

The mapping persists to `localStorage`. Plugging in the same controller on the next session restores all assignments.

---

## Snapshots

A `SnapshotManager` captures the full mixer state — all fader positions, send levels, mute/solo flags, delay/reverb parameters — into a named slot. Up to 8 snapshots can be stored. Recalling a snapshot crossfades all `GainNode` values over 300ms using `linearRampToValueAtTime`, so transitions don't click.

```js
function recallSnapshot(snapshot) {
  const now = audioCtx.currentTime;
  for (const [key, value] of Object.entries(snapshot.gains)) {
    const node = gainNodeMap.get(key);
    if (node) node.gain.linearRampToValueAtTime(value, now + 0.3);
  }
}
```

This is scene recall. In a live performance context, you can set up a verse mix, a breakdown mix, and a chorus mix ahead of time, then switch between them with a button press (or a MIDI CC mapped via MIDI Learn).

---

## Euclidean Rhythms

The DUB syntax gained a new pattern shorthand: `E(k,n)` — Euclidean rhythm with `k` hits distributed as evenly as possible across `n` steps.

`E(3,8)` → `x--x--x-` (the Afro-Cuban tresillo)
`E(5,8)` → `x-xx-xx-` (the Cuban cinquillo)

The algorithm is Bjorklund's: distribute `k` hits across `n` slots so the intervals between hits are as equal as possible. The implementation lives in `src/lib/euclidean.js` and has its own test suite.

This is meaningful for DUB specifically — polyrhythmic drum patterns built from overlapping Euclidean sequences are a core tool of the genre.

---

## The Multiband Preamp

The master preamp is a configurable bank of crossover filters — 3, 4, or 5 bands. Each band is a `BiquadFilterNode` pair (HP + LP) implementing a Butterworth crossover, so the bands sum flat.

Per-band controls: gain, saturation, reverb send, delay send. The idea is frequency-dependent effects routing: heavy reverb on the mid frequencies, aggressive delay on the highs, clean sub-bass that stays tight.

The HPF and LPF on the master preamp input and output act as the overall bandwidth controls — useful for the "telephone filter" effect or for cutting sub-rumble when working on small speakers.

---

## Audio Visualizer

A 32-bar FFT visualizer runs in the toolbar strip. The `AnalyserNode` feeds a `Uint8Array` on every animation frame. Each bar averages a frequency band, applies a slight power curve (`Math.pow(peak / 255, 0.9) * 1.7`) to make quiet signals more visible, and draws a green rectangle.

```js
analyser.getByteFrequencyData(visualizerData);
const bars = 32;
const band = Math.floor(visualizerData.length / bars);
for (let i = 0; i < bars; i++) {
  const peak = Math.max(...visualizerData.slice(i * band, (i + 1) * band));
  const mag = Math.min(1, Math.pow(peak / 255, 0.9) * 1.7);
  ctx.fillRect(i * (bw + gap), h - mag * h, bw, mag * h);
}
```

DPR-aware canvas sizing keeps it crisp on retina displays without layout jank.

---

## Draft Metadata

The last quality-of-life addition: `; tempo:`, `; bars:`, and `; key:` comment directives at the top of a script.

```dub
; Billy Jean - Michael Jackson
; tempo: 117
; bars: 16
```

When a preset is loaded, these comments are parsed and the transport is updated to match. This means presets can be self-contained — no need to manually adjust BPM before hitting play. The extraction is deliberately conservative: if the value is out of range or malformed, it silently ignores it.

---

## What This Adds Up To

MIDI on SCOOPS went from a single shared signal path to:

- Per-track dry/reverb/delay routing with individual faders
- BPM-synced delay bus with feedback and tap tempo
- MIDI learn for any mixer control
- 8-slot snapshot manager with smooth crossfade recall
- Euclidean rhythm shorthand (`E(3,8)`)
- Multiband preamp with configurable crossover frequencies
- FFT visualizer in the toolbar
- Self-contained preset metadata via comment directives

The underlying design principle throughout: DUB is about the mix in motion. The goal wasn't to build a DAW. It was to make the mixer playable — something you can reach for mid-performance and get a result immediately.

---

*MIDI on SCOOPS is a plain-text DUB music prototyping tool. Try it live at [m0s.soypache.co](https://m0s.soypache.co).*
