---
$render: ../../lib/gh_pages.pug
title: "Five Years, Six Runtimes: Building Jamrock"
description: "I've been building a JavaScript SSR framework across five squashed revisions, nine runtimes, and one very stubborn GTK4 async bug. This is how it started and where it's going."
date: 2026-02-18
icon: bullhorn
---

# Five Years, Six Runtimes: Building Jamrock

> I've been building a JavaScript SSR framework across five squashed revisions, nine runtimes, and one very stubborn GTK4 async bug. This is the beginning of a series on what I've been learning.

## A Bit of Context

I'm a "learn by building" kind of person. I built [somedom](https://github.com/pateketrueke/somedom) because I wanted to understand how virtual DOMs actually work. I built [nohooks](https://github.com/pateketrueke/nohooks) because I wanted to understand reactive state without magic. Before Svelte I was using Ractive — same author, same instinct toward templates that don't fight you. Then htmx came along and the hypermedia ideas clicked. Then SolidJS. Then Svelte 5.

What I kept wanting was a framework where the server and the component file are the same thing. Single-file components with server logic inline. No separate API routes. Forms that work without JavaScript, with JavaScript layered on top. SvelteKit does this well. The problem is SvelteKit is tied to a runtime. I wanted to run the same app on Node, Deno, Bun, and whatever else came along — without rewriting anything.

That's where Jamrock came from.

## The Commit Log

```
c42c518  chore: fifth revision    (1 year, 2 months ago)
1f9fd79  chore: fourth revision   (1 year, 3 months ago)
1d4e29e  chore: third revision    (2 years, 7 months ago)
84066fc  chore: second revision   (3 years, 2 months ago)
fbe128e  chore: initial revision  (3 years, 8 months ago)
b5631ee  first commit: empty README (5 years ago)
```

Six commits. Each one is a squash of months of work. I don't write changelogs — I squash and move on. When I look at this log I don't see a timeline, I see the project deciding not to stop.

## What Jamrock Looks Like

If you've used SvelteKit you'll recognize the shape. Pages in `+page.html`, layouts in `+layout.html`, error boundaries in `+error.html`. Server logic in `<script context="server">` inside the same file:

```html
<script context="server">
  export async function GET({ session }) {
    return { user: await session.get('user') }
  }
</script>

<script>
  export let user;
</script>

<h1>Hello, {user.name}</h1>
```

Sessions, CSRF, and auth are built in. Forms work without JavaScript. Client interactivity layers on top. The Svelte 5 syntax felt right because I'd been using Svelte for years — and before that Ractive, which the same author built. The idea of templates that are just HTML with a bit of reactivity sprinkled in has always made more sense to me than JSX.

The part that's different from SvelteKit: the core never touches `process`, `Bun.serve`, or `Deno.serve` directly. Every runtime ships an adapter — `lib/node/server.js`, `lib/bun/server.js`, and so on — that translates the runtime's native objects into Jamrock's internal model. The core stays portable. The adapter does the platform-specific work.

## Why GTK4

Here's one I didn't expect: GTK4.

It started with a personal project — I wanted a custom audio player with a specific UI. Ended up building it with GJS (the GNOME JavaScript bindings). At some point while wiring it up I realized: Jamrock handles requests. GJS can start an HTTP server. The component rendering is just function calls. There's no reason this has to be a web server — it could be a desktop widget.

I tried it. It worked. And once it worked, the question "why not?" was hard to answer.

So GTK4/GJS became an adapter. The same `+page.html` files that serve HTTP requests in Node can render GTK4 widgets on the desktop. It's experimental, it's weird, and I love it.

## The GJS Async Problem

Running Jamrock on GTK4 through libsoup (GLib's HTTP library) hit a wall early: async code doesn't behave the way you'd expect inside Soup request handlers.

The GLib main loop runs Promise microtasks differently than Node does. In practice, returning a `Promise` from a Soup callback and expecting it to resolve cleanly before the response is sent — doesn't work. The handler returns, Soup tries to respond, and your async work is still pending.

I spent real time trying to crack this. Explored coroutines as a way to bring structured async programming to GJS without Promises — use generator functions with a runner that manually steps through yields, so control stays synchronous from Soup's point of view. The concept was sound. But getting it to work reliably under the real libsoup serve path was a different story. The interaction between GLib's event loop and Soup's message lifecycle is finicky enough that even patterns that worked in isolation broke under load.

The decision: GJS handlers run synchronously. If you need to do I/O in a GTK4 Jamrock handler, you do it with sync APIs. It's a constraint, not a bug. For a desktop widget use case — which is what GTK4 is really for here — it's fine.

## The Recent Sprint: Nine Runtimes

The most recent round of work, across February and early March 2026, added a lot of surface area fast.

The insight: WinterJS, Cloudflare Workers, and Vercel Edge all implement the same `addEventListener('fetch', handler)` pattern from the WinterCG spec. One adapter is basically three:

```
lib/winterjs/server.js     → WinterJS (SpiderMonkey, WASIX)
lib/cloudflare/server.js   → Cloudflare Workers  (~identical)
lib/vercel-edge/server.js  → Vercel Edge          (~identical)
lib/llrt/server.js         → AWS Lambda (LLRT runtime)
```

AWS Lambda needed its own adapter because APIGateway has a different event shape — but it's still under 100 lines. Each new adapter took about 30 minutes. The architecture paying off in exactly the moment you hoped it would.

The tally now: nine deployment targets from a single codebase.

## Hot Reload Was Lying

There was a subtle race condition in live reload that had been bothering me for a while.

File change → reload event → client requests updated route → 404 → reload again → works. That second reload was the tell. The file watcher was firing before the new route had finished registering. The request came in during that gap.

Fix was a `syncing` promise in the hot reload path:

```ts
let syncing: Promise<void> | null = null;

async function retryCompile() {
  if (syncing) await syncing;
  return createHandler(env.routes);
}
```

Client request now waits for the compile to settle before the route lookup happens. The 404 flash is gone.

## What's Next

This is the first post in a series. Future posts will go deeper on specific pieces:

- **The GJS widget story** — what it actually looks like to run a Jamrock app as a desktop widget, and where I want to take it (there's a GTK4 browser prototype in my head)
- **The SSE architecture** — edge runtimes like WinterJS and txiki don't support WebSockets; the plan is Server-Sent Events for push, `POST /@rpc` for client→server. Design is done; implementation is next
- **The runtime capability model** — formalizing what each runtime can and can't do, and surfacing that cleanly in the CLI

In the meantime, the code is at [github.com/pateketrueke/jamrock](https://github.com/pateketrueke/jamrock) and there's a docs site at [jamrock.site](https://jamrock.site) that got a proper rewrite this cycle.

---

*I'm building this because I find it interesting, not because I think you should switch frameworks. If multi-runtime SSR or GTK4 widgets sound like your kind of weird, follow along.*
