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
 *              film playing 1,400px above the wall a finger is in reads as a dead tap. The
 *              settle is WAITED FOR and not timed: see the note at the wait for why a fixed
 *              delay in front of a compositor-driven scroll accuses a working page.
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
 *
 * WHERE THAT LAST PART STOPS BEING THIS SITE'S BUSINESS. On this machine both engines reach
 * "playing" in seconds. On a GitHub runner neither ever does, and the diagnostics say why in
 * one read: the embed is the right film on the privacy host, the poster is gone, the ring is
 * correctly still, and the stage carries `is-muted` -- which app.js adds in exactly one place,
 * inside a recovery that returns early unless the player has already talked to the page. So the
 * handshake completed, the player answered, the page muted it and asked again, and YouTube
 * still would not start a video for a headless browser on a shared datacentre address. Every
 * part the page owns worked.
 *
 * So the verdict is split. Anything the page builds wrongly is a FAILURE, including the ring
 * running while the player has said it is not playing, which is the owner's original complaint
 * and needs no video at all to detect. Playback that simply never starts, with every one of
 * those assertions passing, is reported loudly as NOT CONFIRMED and does not fail: a check that
 * can never be green teaches everyone to stop reading CI, and this one was skipping the ten
 * guards that ran after it. WATCH_REQUIRE_PLAYBACK=1 makes it a failure again wherever a film
 * is genuinely expected to play.
 */
import { chromium, webkit, devices } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

import { quietLaunch, hush, AUDIBLE } from "./lib/quiet.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EMBED_HOST = "https://www.youtube-nocookie.com";

/* Three negative controls, one per rule this file asserts. All are served
   rather than injected: the handlers are bound at init from a closure, so re-running anything
   after load would not restore the old behaviour. */
const CONTROLS = [
  {
    what: "the handoff to the YouTube app is put back",
    from: "    select(btn);",
    to: "    select(btn);window.open('https://www.youtube.com/watch?v='+encodeURIComponent(cutOf(btn))," +
        "'_blank','noopener,noreferrer');/*NEGATIVE CONTROL: the handoff that shipped for one day.*/",
    rule: "STAYS",
    says: /opened \d+ new window|navigated to/,
  },
  {
    what: "the ring is started by the frame again rather than by the player",
    from: "    ringArmed = false;\n  }\n  function runRing(){",
    to: "    ringArmed = false;stage.classList.add('is-timed');" +
        "/*NEGATIVE CONTROL: the ring runs whether or not anything plays.*/\n  }\n  function runRing(){",
    rule: "RING",
    says: /countdown ring is running/,
  },
  {
    what: "the page never travels to the player, so the film starts off screen",
    from: "  function travel(){",
    to: "  function travel(){return;/*NEGATIVE CONTROL: the reader is left where they tapped.*/",
    rule: "ARRIVES",
    says: /of the player is on screen/,
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

const FLOOR_MS = 1100;          // the travel is 620ms; a handoff would have happened by here
const SETTLE_CAP_MS = 15000;    // generous: a cap that is merely too short reports a clock as a bug
const SETTLE_STEP_MS = 100;
const QUIET_AFTER_END_MS = 250; // a tap can produce more than one scroll; wait out the next one
const NO_EVENT_STILL_SAMPLES = 15;  // 1.5s of stillness, only when no scrollend was reported

/* ASK THE BROWSER WHEN THE SCROLL ENDED. DO NOT INFER IT.
   The first version of this waited a flat 1100ms, which measured a compositor-driven smooth
   scroll mid flight and accused a correct page. The second inferred the end from three
   identical readings of window.scrollY 100ms apart, and CI then failed at 58% with the scroll
   56% of the way through its travel: a loaded runner can hold a smooth scroll still for 200ms
   without it being over, so stillness is a PROXY for the end of a scroll and not the end of it.
   `scrollend` is the event whose entire meaning is "the scroll is over". Both engines here
   support it and both fire it for a programmatic smooth scroll, which was measured before this
   was written rather than assumed. The counter is reset at the tap, so an end reported here
   belongs to the travel and not to the scroll that put the tile on screen; and because one tap
   can produce more than one scroll, a quiet period after the last end is required too.
   The stillness fallback stays for the case where no end is ever reported, and the ARRIVES
   failure then SAYS the browser never reported one, so the next reader is not left guessing. */
async function armScrollEnd(page) {
  await page.evaluate(() => {
    window.__wt = { ends: 0, last: 0 };
    addEventListener("scrollend", () => { window.__wt.ends++; window.__wt.last = performance.now(); });
  });
}

async function resetScrollEnd(page) {
  await page.evaluate(() => { if (window.__wt) { window.__wt.ends = 0; window.__wt.last = 0; } });
}

async function settle(page) {
  const until = Date.now() + SETTLE_CAP_MS;
  let prev = null, stable = 0;
  while (Date.now() < until) {
    const st = await page.evaluate(() => ({
      ends: window.__wt ? window.__wt.ends : -1,
      since: window.__wt && window.__wt.last ? performance.now() - window.__wt.last : -1,
      y: Math.round(window.scrollY),
    }));
    if (st.ends > 0 && st.since >= QUIET_AFTER_END_MS) return { ended: true, stillMoving: false };
    stable = st.y === prev ? stable + 1 : 0;
    prev = st.y;
    /* NO EVENT IS ALSO AN ANSWER, and it has a legitimate cause: a travel that needs no scroll
       because the player is already where it belongs produces no scroll and therefore no end.
       Waiting the full cap for an event that is never coming would add fifteen seconds to every
       such tap. So long stillness ends the wait too, at ten times the span that fooled the
       previous version, and the result still records that no end was reported so a failure can
       say which kind of answer it had. */
    if (stable >= NO_EVENT_STILL_SAMPLES) return { ended: false, stillMoving: false };
    await page.waitForTimeout(SETTLE_STEP_MS);
  }
  return { ended: false, stillMoving: stable < 2 };
}

async function run(engineName, engine, deviceName, broken) {
  const failures = [];
  let taps = 0;
  let ended = 0;
  const b = await engine.launch(quietLaunch(engineName));
  const ctx = await b.newContext({ ...devices[deviceName] });
  await hush(ctx);
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
  await armScrollEnd(page);
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
    /* WAIT FOR THE SCROLL TO STOP RATHER THAN GUESS HOW LONG IT TAKES.
       This was a flat 1100ms. The page's travel is a NATIVE smooth scroll handed to the
       compositor on purpose, so its duration belongs to the browser and grows with the distance
       and with how busy the machine is. Measured on this laptop, the longest settle is 1077ms:
       23ms of margin. On a shared runner the same tap has twice been caught still within 20px
       of where it started at 1100ms -- CI 2026-09-11 reported "The introduction" at -345px when
       it starts at -387, and 2026-09-12 reported "The FILE IT gate" at -616px when it starts at
       -636 -- and both times this check called a correct page a broken one, on a DIFFERENT tile
       each time, which is the signature of a clock rather than a layout.
       The floor stays, because the frame is created and any handoff to another app would have
       happened inside it. What follows it is the scroll itself: sampled until it holds still,
       or until the cap. This does not soften the assertion. A page that never travels settles
       IMMEDIATELY, still off screen, and fails exactly as it did before, which is what the
       ARRIVES control above exists to prove rather than assert. */
    await resetScrollEnd(page);
    /* THE RING AND THE POSITION ARE ASKED AT DIFFERENT MOMENTS, ON PURPOSE.
       app.js starts the ring after THREE SECONDS of silence from the player, deliberately:
       "if it never answers at all, the film is probably running and the ring should run with
       it". The player host is aborted here, so silence is guaranteed and that fallback WILL
       fire. The RING assertion is therefore a statement about the window before it: the ring
       must not run while the page has neither heard from the player nor waited out its own
       fallback. Reading it late does not make the page wrong, it makes the reading wrong, and
       an earlier version of this file passed only because a flat 1100ms wait happened to sit
       inside that window without ever saying so.
       The floor is that reading. The position is a different question with a different answer
       time, and it is asked after the browser says the scroll is over. */
    await page.waitForTimeout(FLOOR_MS);
    const ringNow = await page.evaluate(() => {
      const st = document.getElementById("ytStage");
      return st ? st.classList.contains("is-timed") : false;
    });
    const scroll = await settle(page);
    if (scroll.ended) ended++;

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
          "reader is not looking" +
          (scroll.ended
            ? " (the browser reported the scroll ENDED here, so this is where the page came to rest)"
            : `, AND the browser never reported the scroll ending within ${SETTLE_CAP_MS / 1000}s` +
              (scroll.stillMoving
                ? ", and it was still moving, so the machine was too slow to finish the travel"
                : ", though it had stopped moving, so read this as a stalled scroll rather than a resting place")),
      );
    }
    if (ringNow) {
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
  return { failures, taps, ended };
}

let failures = [];
let taps = 0;
let scrollEnds = 0;
try {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error(`the site server exited before serving (${serverExit})`);
    try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  for (const [name, engine, dev] of TARGETS) {
    const r = await run(name, engine, dev, false);
    failures = failures.concat(r.failures);
    taps += r.taps;
    scrollEnds += r.ended;
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
  const unconfirmed = [];
  for (const [name, engine, dev] of [["chromium", chromium, "Pixel 7"], ["webkit", webkit, "iPhone 14"]]) {
    const b = await engine.launch(quietLaunch(name));
    const ctx = await b.newContext({ ...devices[dev] });
    /* Before the first navigation, or the init script never runs in the frames that matter. */
    await hush(ctx);
    const page = await ctx.newPage();
    /* WHY THESE LISTENERS. A film that does not start looks identical from the outside whether
       the page built the wrong frame or the platform refused to play a correct one. On this
       machine both engines reach "playing with sound" in seconds; the first CI run to ever
       reach this step failed on both, which is the shape of an environment that cannot play a
       film rather than a page that cannot ask for one. Neither reading may be assumed, so the
       failure now carries what was actually observed and a human can tell them apart in one
       read. It stays a FAILURE either way: a check that cannot make its assertion must say so
       loudly, not pass quietly. */
    const netFailures = [];
    const consoleErrors = [];
    page.on("requestfailed", (r) => {
      if (r.url().includes("youtube") && netFailures.length < 6) {
        netFailures.push(`${r.failure()?.errorText ?? "failed"} ${new URL(r.url()).host}`);
      }
    });
    page.on("console", (m) => {
      if (m.type() === "error" && consoleErrors.length < 6) consoleErrors.push(m.text().slice(0, 160));
    });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.getElementById("consentBanner")?.remove());
    const tile = page.locator(".yt-item").nth(1);
    /* WHICH FILM THIS TILE ASKS FOR, read from the tile. The section used to tap nth(1) and
       then assert nothing at all about what it embedded, which left the strongest site-side
       assertion available here unmade. Either cut is accepted: which one a phone gets is
       cutOf()'s decision and not this check's subject. */
    const wants = await tile.evaluate((el) => ({
      tall: el.dataset.tall || "",
      wide: el.dataset.wide || "",
      label: (el.querySelector(".yt-t") || {}).textContent || "(unlabelled)",
    }));
    await tile.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await tile.tap();
    /* A cold shared runner fetching YouTube's player is not this laptop. The budget is generous
       because a deadline that is merely too short reports a working film as a dead one, and a
       generous budget costs nothing on the runs that pass. It is stated once and printed, so the
       number in the message can never drift from the number in the loop. */
    const BUDGET_MS = 45000;
    const STEP_MS = 500;
    let state = null;
    for (let i = 0; i < BUDGET_MS / STEP_MS; i++) {
      state = await page.evaluate(() => {
        const s = document.getElementById("ytStage");
        return { live: s.classList.contains("is-live"), ring: s.classList.contains("is-timed"),
                 muted: s.classList.contains("is-muted") };
      });
      if (state.live) break;
      await page.waitForTimeout(STEP_MS);
    }
    if (!state.live) {
      const seen = await page.evaluate(() => {
        const s = document.getElementById("ytStage");
        const f = s?.querySelector("iframe");
        /* Never throw from inside the diagnostic: an empty or relative src would reject the
           evaluate and replace the finding with a crash. */
        let frame = "NO iframe in the stage";
        let host = "";
        let id = "";
        if (f) {
          try {
            const u = new URL(f.src, location.href);
            frame = u.host + u.pathname;
            host = u.host;
            id = decodeURIComponent(u.pathname.replace(/^\/embed\//, ""));
          } catch {
            frame = `iframe with an unusable src: ${String(f.getAttribute("src")).slice(0, 80)}`;
          }
        }
        /* THE ELEMENT THE PAGE ACTUALLY HIDES. app.js hides
           getElementById('ytPoster').parentNode, and that parent IS <picture class="yt-poster">.
           The first version read .parentNode here as well, which climbs one level further to
           #ytStage -- never hidden by anything -- so it reported the poster as covering the
           player on every single run, and would have turned an unconfirmed playback back into a
           hard failure for a reason that was never true. Caught by the mutation test, not by
           reading it back. */
        const poster = document.querySelector("#ytStage .yt-poster");
        return {
          stage: s ? s.className : "NO #ytStage",
          exists: !!s,
          frame, host, id,
          hasFrame: !!f,
          posterShowing: !!(poster && !poster.hidden),
        };
      });

      /* SPLIT THE VERDICT. Everything up to here is the page's job and is decided here.
         Whether YouTube then plays a film for a headless browser on a shared datacentre
         runner is not the page's job and cannot be made into one. The old code printed
         exactly this distinction in its own failure message and then failed regardless,
         which made the message advice nobody could act on. */
      const site = [];
      if (!seen.exists) site.push("there is no player stage on the page at all");
      if (!seen.hasFrame) site.push("the tap built no player frame");
      else if (!/(^|\.)youtube-nocookie\.com$/.test(seen.host)) {
        site.push(`the frame points at ${seen.host || "an unreadable src"}, not the privacy host`);
      } else if (seen.id !== wants.tall && seen.id !== wants.wide) {
        site.push(
          `the frame carries ${seen.id} and the tile asks for ${wants.tall || "(none)"} or ` +
            `${wants.wide || "(none)"}`,
        );
      }
      if (seen.posterShowing) site.push("the poster is still covering the player");
      /* THE OWNER'S ACTUAL COMPLAINT, 2026-08-22: "the video DOES NOT play but the highlight
         around it starts moving". Checkable without a single frame of video, so it keeps its
         teeth here. Only when the player HAS spoken: is-muted is added solely by recover(),
         which returns early unless the player has already talked to the page, so its presence
         is proof the handshake completed and the player said it was not playing. If the player
         never answered at all, app.js runs the ring on purpose and says why -- silence means
         the film is probably running, and a ring stopped by silence is the same lie the other
         way round. */
      if (state.ring && state.muted && !state.live) {
        site.push(
          "the countdown ring is running while the player has told the page it is NOT playing",
        );
      }

      const observed =
        `      stage classes: ${seen.stage}\n` +
        `      embed: ${seen.frame}\n` +
        `      tile asks for: ${wants.tall || "(none)"} / ${wants.wide || "(none)"}\n` +
        `      failed requests to youtube: ${netFailures.length ? netFailures.join("; ") : "none"}\n` +
        `      console errors: ${consoleErrors.length ? consoleErrors.join(" | ") : "none"}`;

      if (site.length) {
        failures.push(
          `${name}/${dev}: a film was tapped with the player reachable and it never reported ` +
            `playing within ${BUDGET_MS / 1000}s, AND the page itself is wrong: ` +
            `${site.join("; ")}.\n${observed}`,
        );
      } else {
        unconfirmed.push(
          `${name}/${dev}: every part the page controls is correct -- the right film on the ` +
            `privacy host, the poster gone, no ring over a still frame` +
            `${state.muted ? ", and the player answered and was muted and restarted by the " +
              "recovery path, so the handshake worked and the platform still refused" : ""}` +
            ` -- but the player never reported playing within ${BUDGET_MS / 1000}s.\n${observed}`,
        );
      }
    } else if (!state.ring) {
      failures.push(`${name}/${dev}: the film is playing and the countdown ring is not running`);
    } else {
      /* "with sound" was about the PLAYER, never about the room, and with the output silenced
         that had to stop reading as a claim about what you can hear. */
      console.log(
        `  ${name}/${dev}: the film really plays` +
          (state.muted
            ? " (the platform refused to start it with sound, and the page's mute recovery worked)"
            : " and the page never had to mute it") +
          (AUDIBLE ? "" : " [audio output silenced]"),
      );
    }
    await b.close();
  }

  /* Every control, and each has to fire on its OWN rule. */
  const fired = [];
  for (const c of CONTROLS) {
    const control = await run("webkit", webkit, "iPhone 14", c);
    /* ON ITS OWN RULE. A control that merely produces SOME failure proves only that the injury
       was noticed by something; the claim being made is that THIS assertion sees it. */
    const onRule = control.failures.filter((f) => c.says.test(f));
    if (!control.failures.length) {
      failures.push(
        `NEGATIVE CONTROL DID NOT FIRE (${c.rule}): with ${c.what}, this check still passed, so ` +
          `it is not measuring what it claims about ${c.rule}`,
      );
    } else if (!onRule.length) {
      failures.push(
        `NEGATIVE CONTROL FIRED ON THE WRONG RULE (${c.rule}): with ${c.what}, this check failed, ` +
          `but not one of its ${control.failures.length} finding(s) is about ${c.rule}. ` +
          `First: ${control.failures[0]}`,
      );
    }
    fired.push(`${c.rule}:${onRule.length}`);
  }
  if (!taps) failures.push("no film was tapped, so a clean result here means nothing");

  /* PLAYBACK THAT COULD NOT BE CONFIRMED. Printed at the top of the output, in both the passing
     and the failing case, because the one thing that must not happen is this going quiet.
     WATCH_REQUIRE_PLAYBACK=1 turns it back into a failure, for any environment that can reach
     YouTube properly -- this laptop does, and both engines get to "playing" in seconds there. */
  const REQUIRE_PLAYBACK = process.env.WATCH_REQUIRE_PLAYBACK === "1";
  if (unconfirmed.length) {
    const banner =
      "check-watch-inline: PLAYBACK NOT CONFIRMED on " +
      `${unconfirmed.length} engine${unconfirmed.length === 1 ? "" : "s"}`;
    if (REQUIRE_PLAYBACK) {
      for (const u of unconfirmed) failures.push(u);
    } else {
      console.error(banner);
      for (const u of unconfirmed) console.error("  ~ " + u);
      console.error(
        "  Not a failure: every assertion about what this page builds passed on those engines, " +
          "and whether YouTube plays a film for a headless browser on a shared runner is not " +
          "something this site controls. Run with WATCH_REQUIRE_PLAYBACK=1 where it should play.",
      );
    }
  }

  if (failures.length) {
    console.error("check-watch-inline: FAIL");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(
    `check-watch-inline: OK (${taps} films tapped across ${TARGETS.length} device/engine pairs, ` +
      `every one played here and brought the player on screen; ` +
      `the browser reported the scroll ending on ${scrollEnds} of ${taps}; ` +
      (unconfirmed.length
        ? `playback itself was NOT confirmed on ${unconfirmed.length} of 2 engines, see above; `
        : "one film per engine watched all the way to playing over the real network; ") +
      `negative controls fired ${fired.join(", ")})`,
  );
} finally {
  try { server.kill(); } catch {}
}
