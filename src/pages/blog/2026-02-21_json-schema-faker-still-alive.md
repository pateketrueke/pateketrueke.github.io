---
$render: ../../lib/gh_pages.pug
title: "Eleven Years of json-schema-faker — and I Just Shipped v0.6.0"
description: "json-schema-faker was the first open-source library I ever maintained. Eleven years, one sponsor, and a lot of accumulated debt — here's what it took to bring it current."
date: 2026-02-21
icon: bullhorn
---

# Eleven Years of json-schema-faker — and I Just Shipped v0.6.0

> I first committed this library in April 2015. Eleven years, one sponsor, and a 41-issue backlog later — here's what v0.6.0 actually took.

## How It Started

I needed to generate realistic fake data from a JSON Schema. This was April 2015 — before the tooling ecosystem around JSON Schema matured, before Draft 2019-09, before 2020-12, back when `definitions` was the only way to reference schemas and everyone had their own idea of what `allOf` meant.

There was nothing that did what I needed. So I built it. The first commit landed on April 7, 2015. By July we had faker.js and chance.js integration and the first real releases (v0.1.x).

json-schema-faker reads a JSON Schema and generates valid, realistic fake data from it. You give it a schema describing a `User` object with constraints — string formats, nested refs, conditional branches — and it gives you data that satisfies those constraints. It plugs into test suites, API mocking layers, contract testing. Anywhere you'd otherwise hand-write fixtures.

I shipped it. People found it. Some of them filed issues. Some of them kept using it for years.

That's how open source works, and it surprised me every time someone showed up in the issue tracker with a real use case I hadn't considered.

## What "Maintaining" Actually Looks Like

I have one GitHub sponsor.

I don't say this to complain — I'm genuinely grateful for that one person. I say it because it's the honest number, and because I think most people who use open-source tools don't have a clear picture of what it looks like on the other side. You use a library, it works, you move on. Meanwhile, someone is triaging a 41-issue backlog on a Saturday.

That's what February looked like for me. I sat down to push v0.6.0 and ended up spending the better part of a week doing what maintenance actually requires: reading years of accumulated reports, deciding what's a bug versus a misunderstanding versus a design decision that should never change, writing regression tests for things that never had them.

41 open issues. I closed 27. Not by punting — by writing fixtures, writing tests, and fixing the ones that were actually broken.

The final count: **465 passing tests, 4 intentional skips** (documented bugs, not forgotten ones).

## What Broke and What I Fixed

Six bugs had been sitting tracked but unresolved. Here's what they were and why they were hard:

**Metadata leaking through `$ref` siblings.** When you annotate a `$ref` with `description` or `title`, those annotation keywords would bleed through into the generated object as properties. The fix was in `ref-resolver.ts`: strip annotation-only keywords before merging `$ref` siblings. Simple in retrospect, subtle to diagnose.

**Array bounds ignored by global options.** If a schema said `minItems: 5` and the global options said `maxItems: 3`, the library would silently violate the schema. Schema-level constraints now act as hard bounds that global options cannot override.

**`allOf` + `contains` producing invalid arrays.** Multiple `contains` clauses from nested `allOf` were being reduced to one. The fix: collect all `contains` into a `containsAll[]` array and satisfy each independently.

**Circular ref depth crashes producing empty arrays.** When a circular reference hit the depth limit, it was returning an empty array — which would fail `minItems` validation. Now it returns a stub array of `null` values sized to `minItems` instead.

None of these were glamorous. All of them were real.

## The Playground

Alongside the library work, I rebuilt the web playground from scratch for v0.6.0.

The old one was thin — a single editor, a handful of options, no persistence. The new one has multi-tab schema editing, where you can define multiple schemas side by side and reference between them via `$defs`. It has a full options panel (23 options, organized by category). It has GitHub Gist integration — save, load, share, delete — with URL hash routing so you can link directly to a public Gist without authentication. It works offline via a service worker. It supports YAML input. It has inline fuzzy search across the documentation.

I also built a local bundle (`jsf.bundle.js`) so the playground runs against the actual v0.6.0 code instead of the CDN-pinned v0.5.9 it was using before. That was the only honest way to ship it.

## The `propAliases` Feature

One thing I added that I think is worth calling out: `propAliases`.

The library had built-in support for the legacy `definitions` keyword — JSON Schema's old way of declaring reusable subschemas before `$defs` was standardized. I removed it. Not because it couldn't work, but because building it into the core was the wrong layer. Instead, `propAliases` lets you map any non-standard key to a standard one:

```js
jsf.option({ propAliases: { definitions: '$defs' } });
```

This also fixed a long-standing issue (#805) where extension keys with non-identifier characters (like `x-faker`) couldn't be handled by the internal resolution logic. The alias layer is clean enough to handle those.

Removing features in a library with years of users is uncomfortable. I did it anyway because the alternative — carrying legacy behavior indefinitely — is how libraries become impossible to maintain.

## Why I'm Still Doing This

I don't have a clean answer.

Part of it is that the library is genuinely useful and there's no real alternative that does the same thing with the same fidelity. Part of it is that I've been doing it long enough that stopping feels like abandonment. Part of it is that every now and then someone files an issue that tells me they're running json-schema-faker in production at a company I've heard of, and that still means something to me.

v0.6.0 is a real milestone. Modern JSON Schema draft support. A test suite that actually covers the edge cases. A playground worth using. An extension API that matches what the v4 docs promised.

If you're using it, or you're evaluating it, or you know someone who generates test fixtures by hand when they have a schema sitting right there — this is the version worth pointing them at.

And if you've ever gotten value from it: [there's a sponsor button](https://github.com/sponsors/pateketrueke). One person is already there. The work is easier when it's not entirely invisible.

## How this was possible?

**json-schema-faker** journey for v0.6.0 release sprint across **Feb 18-21, 2026** — roughly 4 sessions, ~8 hours of work total.

Main concerns explored:

- **Library rewrite** — Draft 2020-12 support (if/then/else, prefixItems, allOf+contains fixes)
- **Issue triage** — 41 GitHub issues, 27 closed, 10 turned into fixtures; went from 0 → 465 passing tests
- **Bug fixes** — 6 tracked bugs fixed: metadata leaking through `$ref`, array bounds violations, circular ref depth crashes
- **Playground v6** — multi-tab schema editor, Gist integration (save/load/share), YAML/JSON toggle, offline service worker, inline fuzzy search (Fuse.js), local bundle replacing CDN
- **`propAliases` feature** — new option for custom key remapping, also removed legacy `definitions` support
- **Extension API** — reimplemented `define/reset/extend` to match v4 behavior

> None of this was free, but without AI it would have cost a lot more — in time, at least. Now I can sit down, do something else, or just take the rest of the day.

## What's Next

Draft 2020-12 support is now solid. The playground is in a state I'm not embarrassed by. The next focus is visibility — getting the library in front of developers who are generating test data the hard way and don't know there's a better option.

If you have a use case that isn't covered, file an issue. I actually read them.

---

*json-schema-faker is available on [npm](https://www.npmjs.com/package/json-schema-faker) and [GitHub](https://github.com/json-schema-faker/json-schema-faker). The playground is at [json-schema-faker.js.org](https://json-schema-faker.js.org).*
