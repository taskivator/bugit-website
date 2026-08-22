/**
 * A FILM PLAYS ON THIS PAGE. TAPPING ONE DOES NOT LEAVE THE SITE.
 *
 * THE DEFECT THIS EXISTS FOR. For one day a tap on a phone called window.open() on a
 * youtube.com/watch URL, which iOS and Android hand to the installed YouTube app. Owner,
 * 2026-08-22: "why tapping on the videos in mobile view opens the YouTube app??? ... they want
 * the video to be [played] on the YouTube player we [have] IN THE WEBSITE". Every visitor who
 * pressed play on a phone was handed to another app, on the section of the site whose whole
 * job is to show the product working, and the page they left was the one selling it.
 *
 * WHY THIS AND NOT check-channel. That check reads WHICH cut a press produces. This one reads
 * whether the press keeps the reader here at all -- a different question, and the one that was
 * wrong. Both matter and neither implies the other.
 *
 * THE SUBJECT IS COMPUTED. Every tile in the wall is tapped, on every device listed, and the
 * id each one must embed is read from that tile rather than from a list kept here. A film added
 * to the channel is covered on the day it renders.
 *
 * FOUR THINGS PER TAP:
 *   STAYS      no new page or window is opened, and this one does not navigate away.
 *   PLAYS      an embed exists on the privacy host, carrying the id that tile asked for.
 *   ARRIVES    the player is substantially on screen once the transition settles, because a
 *              film playing 1,400px above the wall a finger is in reads as a dead tap.
 *   RING       the countdown around the stage is NOT running. In this context the player host
 *              is aborted, so nothing can play; a ring moving here is the page announcing a
 *              film over a still frame. Owner, 2026-08-22: "the video DOES NOT play but the
 *              highlight around it starts moving". It used to start when the frame was
 *              appended, which is when the page ASKED for a film, not when one began.
 *   HONEST     the tap is a real tap. No force: what Playwright refuses, a finger cannot do.
 *
 * Those run with the player host aborted, because they are questions about the frame this page
 * builds and where it points. AND THEN one film per engine is played for real, over the real
 * network, and the player is asked whether it started -- because "the frame is correct" and
 * "the film is running" turned out to be two different things.
 */
import { chromium, webkit, devices } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EMBED_HOST = "https://www.youtube-nocookie.com";

/* Two negative controls, because this file now asserts two different things. Both are served
   rather than injected: the handlers are bound at init from a closure, so re-running anything
   after load would not restore the old behaviour. */
const CONTROLS = [
  {
    what: "the handoff to the YouTube app is put back",
    from: "    select(btn);",
    to: "    select(btn);window.open('https://www.youtube.com/watch?v='+encodeURIComponent(cutOf(btn))," +
        "'_blank','noopener,noreferrer');/*NEGATIVE CONTROL: the handoff that shipped for one day.*/",
    rule: "STAYS",
  },
  {
    what: "the ring is started by the frame again rather than by the player",
    from: "    ringArmed = false;\n  }\n  function runRing(){",
    to: "    ringArmed = false;stage.classList.add('is-timed');" +
        "/*NEGATIVE CONTROL: the ring runs whether or not anything plays.*/\n  }\n  function runRing(){",
    rule: "RING",
  },
];

const TARGETS = [
  ["chromium", chromium, "Pixel 7"],
  ["webkit", webkit, "iPhone 14"],
  ["webkit", webkit, "iPhone SE"],
];

const PORT = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const server = spawn(process.execPath, ["server.js"], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
});
let serverExit = null;
server.on("exit", (c, s) => { serverExit = s || `code ${c}`; });
const BASE = `http://127.0.0.1:${PORT}`;

/* How much of the player is on screen, 0 to 1, and where the stage is. */
const SEEN = () => {
  const st = document.getElementById("ytStage");
  const r = st.getBoundingClientRect();
  const vis = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
  const f = document.querySelector("#ytStage iframe");
  return {
    frac: r.height > 0 ? vis / r.height : 0,
    src: f ? f.src : "",
    top: Math.round(r.top),
    /* is-timed is the countdown ring. The player host is aborted in this context, so nothing
       is playing and nothing ever will: a ring running here is the page telling the reader a
       film is under way over a frame that will never move. */
    ring: st.classList.contains("is-timed"),
  };
};

async function run(engineName, engine, deviceName, broken) {
  const failures = [];
  let taps = 0;
  const b = await engine.launch();
  const ctx = await b.newContext({ ...devices[deviceName] });
  await ctx.route(EMBED_HOST + "/**", (route) => route.abort());
  let patched = !broken;
  if (broken) {
    await ctx.route("**/app*.js", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      if (body.includes(broken.from)) patched = true;
      route.fulfill({ response: res, body: body.split(broken.from).join(broken.to) });
    });
  }
  const opened = [];
  ctx.on("page", (p) => opened.push(p.url() || "(blank)"));

  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById("consentBanner")?.remove());
  const where = `${engineName}/${deviceName}`;
  const home = page.url();

  const tiles = await page.evaluate(() =>
    [...document.querySelectorAll(".yt-item")].map((b, i) => {
      if (!b.id) b.id = "wt-" + i;
      return { id: b.id, tall: b.dataset.tall, wide: b.dataset.wide,
               label: (b.querySelector(".yt-t") || {}).textContent };
    }));
  if (!tiles.length) failures.push(`${where}: the wall has no films in it, so nothing was tested`);

  for (const t of tiles) {
    const before = opened.length;
    const loc = page.locator("#" + t.id);
    await page.evaluate((id) => {
      document.getElementById(id).scrollIntoView({ block: "center", behavior: "instant" });
    }, t.id);
    await page.waitForTimeout(120);
    try {
      await loc.tap({ timeout: 4000 });
    } catch {
      failures.push(`${where}: "${t.label}" could not be tapped at all`);
      continue;
    }
    taps++;
    await page.waitForTimeout(1100);                 // the travel is 620ms; this is after it

    if (opened.length > before) {
      failures.push(
        `${where}: tapping "${t.label}" opened ${opened.length - before} new window(s) ` +
          `(${opened.slice(before).join(", ")}). A film plays on this page; a tap must not hand ` +
          "the reader to another app.",
      );
    }
    if (page.url() !== home) {
      failures.push(`${where}: tapping "${t.label}" navigated to ${page.url()}`);
    }
    const seen = await page.evaluate(SEEN);
    if (!seen.src) {
      failures.push(`${where}: tapping "${t.label}" created no player at all`);
    } else {
      if (!seen.src.startsWith(EMBED_HOST + "/embed/")) {
        failures.push(`${where}: "${t.label}" embedded ${seen.src.slice(0, 60)}, not the privacy host`);
      } else if (!seen.src.includes("/embed/" + t.tall)) {
        failures.push(
          `${where}: "${t.label}" embedded ${seen.src.split("/embed/")[1].split("?")[0]} and the ` +
            `tile asks for the Short ${t.tall}`,
        );
      }
    }
    if (seen.frac < 0.6) {
      failures.push(
        `${where}: after tapping "${t.label}" only ${Math.round(seen.frac * 100)}% of the player ` +
          `is on screen (its top edge is at ${seen.top}px), so the film is playing somewhere the ` +
          "reader is not looking",
      );
    }
    if (seen.ring) {
      failures.push(
        `${where}: after tapping "${t.label}" the countdown ring is running while the player has ` +
          "not said a word and cannot play at all here, so the page is claiming a film is under " +
          "way over a still frame",
      );
    }
  }
  if (!patched) failures.push("the negative control could never be installed: its anchor is gone");
  await ctx.close();
  await b.close();
  return { failures, taps };
}

let failures = [];
let taps = 0;
try {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error(`the site server exited before serving (${serverExit})`);
    try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  for (const [name, engine, dev] of TARGETS) {
    const r = await run(name, engine, dev, false);
    failures = failures.concat(r.failures);
    taps += r.taps;
  }
  /* AND ONE FILM THAT REALLY PLAYS, per engine, over the real network.
     Everything above runs with the player host aborted, which is right for asking what frame
     this page builds and where it points -- but it cannot tell whether a film ever moves. The
     defect that made this section necessary was exactly that: the frame was correct, the ring
     was running, and nothing played. So one tile per engine is tapped with the host reachable
     and the PLAYER is asked, through the state it posts back, whether it started.
     It is allowed to get there muted. A cross-origin player is not given the reader's
     activation on iOS and cannot start itself with sound; the page mutes it and starts it
     rather than leaving a still frame, and YouTube's own controls carry the way back to sound.
     Headless Chromium refuses unmuted autoplay for the same reason a phone does, so that
     recovery is exercised here rather than assumed. */
  for (const [name, engine, dev] of [["chromium", chromium, "Pixel 7"], ["webkit", webkit, "iPhone 14"]]) {
    const b = await engine.launch();
    const ctx = await b.newContext({ ...devices[dev] });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.getElementById("consentBanner")?.remove());
    const tile = page.locator(".yt-item").nth(1);
    await tile.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await tile.tap();
    let state = null;
    for (let i = 0; i < 32; i++) {
      state = await page.evaluate(() => {
        const s = document.getElementById("ytStage");
        return { live: s.classList.contains("is-live"), ring: s.classList.contains("is-timed"),
                 muted: s.classList.contains("is-muted") };
      });
      if (state.live) break;
      await page.waitForTimeout(500);
    }
    if (!state.live) {
      failures.push(
        `${name}/${dev}: a film was tapped with the player reachable and it never reported ` +
          "playing within 16s. The frame is built and the poster is gone, so the reader is " +
          "looking at a still picture where a film should be running.",
      );
    } else if (!state.ring) {
      failures.push(`${name}/${dev}: the film is playing and the countdown ring is not running`);
    } else {
      console.log(`  ${name}/${dev}: the film really plays${state.muted ? " (muted: the platform " +
        "refused to start it with sound, and the page recovered)" : " with sound"}`);
    }
    await b.close();
  }

  /* Both controls, because this file asserts two different things now. */
  const fired = [];
  for (const c of CONTROLS) {
    const control = await run("webkit", webkit, "iPhone 14", c);
    if (!control.failures.length) {
      failures.push(
        `NEGATIVE CONTROL DID NOT FIRE (${c.rule}): with ${c.what}, this check still passed, so ` +
          `it is not measuring what it claims about ${c.rule}`,
      );
    }
    fired.push(`${c.rule}:${control.failures.length}`);
  }
  if (!taps) failures.push("no film was tapped, so a clean result here means nothing");

  if (failures.length) {
    console.error("check-watch-inline: FAIL");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(
    `check-watch-inline: OK (${taps} films tapped across ${TARGETS.length} device/engine pairs, ` +
      `every one played here and brought the player on screen; one film per engine watched all ` +
      `the way to playing over the real network; negative controls fired ${fired.join(", ")})`,
  );
} finally {
  try { server.kill(); } catch {}
}
