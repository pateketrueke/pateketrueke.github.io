---
$render: ../../lib/gh_pages.pug
title: "X Thread: Five Years, Six Runtimes — Jamrock"
description: "I've been building a JS SSR framework for 5 years."
date: 2026-03-04
icon: bullhorn
---

# X Thread: Five Years, Six Runtimes — Jamrock

---

**1/**
I've been building a JS SSR framework for 5 years.

The entire git log:

```
fifth revision    (1 year, 2 months ago)
fourth revision   (1 year, 3 months ago)
third revision    (2 years, 7 months ago)
second revision   (3 years, 2 months ago)
initial revision  (3 years, 8 months ago)
first commit: empty README (5 years ago)
```

Six squashed commits. Months of work each. Here's what I've been learning 🧵

---

**2/**
I build things to understand them.

Built somedom to understand virtual DOMs.
Built nohooks to understand reactivity without magic.
Used Ractive before Svelte (same author, same instinct).
Loved htmx. Loved SolidJS. Love SFCs.

Jamrock is me trying to understand: what if the runtime wasn't the framework?

---

**3/**
The idea: SSR with Svelte 5 syntax and file-system routing.

Server logic inline, in the same file:

```html
<script context="server">
  export async function GET({ session }) {
    return { user: await session.get('user') }
  }
</script>

<script>export let user</script>
<h1>Hello, {user.name}</h1>
```

Forms work without JS. Sessions and CSRF built in. Progressive enhancement on top.

SvelteKit does this. But SvelteKit is tied to a runtime. I wanted it to run anywhere.

---

**4/**
The key architectural decision: the core never touches `process`, `Bun.serve`, or `Deno.serve`.

Every runtime has an adapter. The adapter translates. The core stays portable.

When WinterJS appeared, adding support was 30 minutes and ~80 lines.

---

**5/**
Current runtime count: 9.

Node · Deno · Bun · GJS/GTK4
txiki.js · WinterJS
Cloudflare Workers · Vercel Edge · AWS Lambda

One codebase. Same routes. Same components. No rewriting.

WinterCG made three of those almost free — Cloudflare, Vercel, and WinterJS share the same `addEventListener('fetch', ...)` API.

---

**6/**
The GTK4 story is my favorite.

It started as a personal project: I wanted a custom audio player. Built it in GJS (GNOME's JS bindings). Then realized —

Jamrock handles requests. GJS can start an HTTP server. The component rendering is just function calls.

So I tried running a Jamrock page as a GTK4 widget. It worked.

---

**7/**
That led to a painful lesson: async code doesn't behave in GJS libsoup handlers the way you'd expect.

I tried coroutines — generator functions stepped by a sync runner — as a way to bring async patterns without Promises.

Didn't hold up in real libsoup handlers. The interaction with GLib's event loop is finicky.

Decision: GJS handlers run sync. Constraint, not a bug. For a widget runtime, it's fine.

---

**8/**
Also fixed a hot reload race that had been annoying me for a while.

File change → reload event → client requests route → 404 → reload again → works.

The watcher was firing before the new route was registered. Classic.

```ts
let syncing: Promise<void> | null = null;

async function retryCompile() {
  if (syncing) await syncing; // wait for in-flight compile
  return createHandler(env.routes);
}
```

Gone.

---

**9/**
This is the first post in a series. Coming up:

→ GTK4 widgets in depth (+ a browser prototype idea)
→ SSE as a WebSocket replacement for edge runtimes
→ The runtime capability model and CLI guards

If multi-runtime SSR or running web components as desktop widgets sounds like your kind of weird — follow along.

Full post: [link]

---

**10/**
Also: if you've built something with Svelte and wished you could deploy it to Cloudflare, a GTK4 desktop, and a Lambda function without touching the app code —

that's literally what Jamrock is for.

github.com/pateketrueke/jamrock
jamrock.site
