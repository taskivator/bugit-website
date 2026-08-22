// The channel section plays the cut that matches the screen.
//
// WHY THIS EXISTS. Every subject on the BugIt channel is uploaded twice: a 1920x1080 cut on
// the videos tab, and a 1080x1920 cut published as a Short. Which of the two is correct is a
// property of the SCREEN, not of the subject. A desktop wants the landscape cut in a 16:9
// stage; a phone wants the Short in a 9:16 one.
//
// The page shipped with ten of its twelve tiles pointing at the Short. On a desktop that
// meant a vertical video inside a 16:9 frame with black pillars over half the width, on the
// one section of the site whose entire job is to show the product working. Nothing caught it,
// and nothing could have: the markup was valid, the ids were real, the posters loaded, every
// other guard here passed, and the only way to see it was to press play and look.
//
// It is not a defect that can be reasoned about from the file names either. The manifest calls
// them "-Yt" and "-Mobile", which is what somebody INTENDED, and the ids in the markup came
// from a different list entirely. So the orientation of each video was read from its own watch
// page once, at author time, and written into channel.json; this asserts that the page agrees
// with that file, and that the page behaves the way the file says it should.
//
//   1. No drift. Every id and poster in the markup is in channel.json, and the other way.
//   2. The posters are the shape they claim. Wide files are landscape, tall files portrait,
//      measured from the decoded image rather than from the path it came from.
//   3. A desktop gets a 16:9 stage and pressing play embeds the WIDE id.
//   4. A phone gets a 9:16 stage and pressing play embeds the TALL id.
//   5. Nothing in the list is truncated, at either width.
//   6. The negative control: point the stage's tall id at the wide cut and require 4 to fail.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

const data = JSON.parse(readFileSync(join(ROOT, "public/media/youtube/channel.json"), "utf8"));
const catalogue = data.videos;

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
const base = `http://127.0.0.1:${PORT}`;

const READ = () => [...document.querySelectorAll(".yt-item")].map((b) => ({
  wide: b.dataset.wide, tall: b.dataset.tall,
  posterWide: b.dataset.posterWide, posterTall: b.dataset.posterTall,
  dur: b.dataset.dur, title: b.dataset.title,
  label: (b.querySelector(".yt-t") || {}).textContent,
  thumbOk: (() => { const i = b.querySelector("img"); return !!i && i.complete && i.naturalWidth > 0; })(),
}));

try {
  for (let i = 0; i < 60; i++) {
    if (serverExit) throw new Error(`the site server exited before serving (${serverExit})`);
    try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  const browser = await chromium.launch();

  // ---- 1. the markup and the catalogue agree ------------------------------
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desk.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector(".yt-list").scrollIntoView({ block: "center" }));
  await page.waitForTimeout(700);
  const tiles = await page.evaluate(READ);

  if (tiles.length !== catalogue.length) {
    fail.push(`the page shows ${tiles.length} films and channel.json lists ${catalogue.length}`);
  }
  for (const v of catalogue) {
    const t = tiles.find((x) => x.wide === v.wide);
    if (!t) { fail.push(`channel.json has "${v.slug}" (${v.wide}) and the page does not`); continue; }
    if (t.tall !== v.tall) {
      fail.push(`"${v.slug}": the page's Short id is ${t.tall}, channel.json says ${v.tall}`);
    }
    if (t.dur !== v.duration) fail.push(`"${v.slug}": duration ${t.dur} vs ${v.duration}`);
    if (t.title !== v.title) fail.push(`"${v.slug}": title drifted from channel.json`);
    if (t.label !== v.label) fail.push(`"${v.slug}": short label drifted from channel.json`);
  }
  for (const t of tiles) {
    if (!catalogue.some((v) => v.wide === t.wide)) {
      fail.push(`the page shows an id that channel.json does not know: ${t.wide}`);
    }
    if (t.wide === t.tall) {
      fail.push(`"${t.label}" points at the same id for both cuts (${t.wide}), so one screen ` +
                "is being shown the wrong shape.");
    }
    if (!t.thumbOk) fail.push(`"${t.label}": the poster did not decode`);
  }
  if (!fail.length) note(`${tiles.length} tiles agree with channel.json, both cuts each`);

  // ---- 2. the posters are the shape they claim ----------------------------
  // Read from the decoded image, not from the folder name: a build that wrote a landscape
  // frame into tall/ would still be serving a file called tall/<slug>.jpg.
  const shapes = await page.evaluate(async (list) => {
    const out = [];
    for (const v of list) {
      for (const kind of ["wide", "tall"]) {
        const src = `/public/media/youtube/${kind}/${v.slug}.jpg`;
        const dim = await new Promise((res) => {
          const im = new Image();
          im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
          im.onerror = () => res({ w: 0, h: 0 });
          im.src = src;
        });
        out.push({ slug: v.slug, kind, ...dim });
      }
    }
    return out;
  }, catalogue);
  for (const s of shapes) {
    if (!s.w || !s.h) { fail.push(`${s.kind}/${s.slug}.jpg did not load`); continue; }
    const landscape = s.w > s.h;
    if (s.kind === "wide" && !landscape) {
      fail.push(`wide/${s.slug}.jpg is ${s.w}x${s.h}, which is portrait`);
    }
    if (s.kind === "tall" && landscape) {
      fail.push(`tall/${s.slug}.jpg is ${s.w}x${s.h}, which is landscape. The phone stage is ` +
                "9:16 and would letterbox it.");
    }
  }
  note(`${shapes.length} posters measured; wide are landscape, tall are portrait`);

  // ---- 3 + 5. the desktop stage --------------------------------------------
  const deskState = await page.evaluate(() => {
    const st = document.getElementById("ytStage");
    const r = st.getBoundingClientRect();
    const cut = [...document.querySelectorAll(".yt-t,.yt-sub,.yt-stage-title")]
      .filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).whiteSpace === "nowrap")
      .map((e) => e.textContent.trim().slice(0, 40));
    return { ratio: r.width / r.height, wide: st.dataset.wide, tall: st.dataset.tall, cut };
  });
  if (Math.abs(deskState.ratio - 16 / 9) > 0.02) {
    fail.push(`the desktop stage is ${deskState.ratio.toFixed(2)}:1, not 16:9`);
  }
  await page.evaluate(() => document.getElementById("ytPlay").click());
  await page.waitForTimeout(400);
  const deskSrc = await page.evaluate(() => {
    const f = document.querySelector("#ytStage iframe");
    return f ? f.src : "";
  });
  if (!deskSrc.includes(`/embed/${deskState.wide}`)) {
    fail.push(`a desktop pressed play and got "${deskSrc.split("/embed/")[1] || deskSrc}". ` +
              `It must embed the landscape cut ${deskState.wide}: a 1080x1920 video in a 16:9 ` +
              "frame is black pillars over half the width.");
  } else note(`desktop: 16:9 stage embeds the landscape cut ${deskState.wide}`);
  for (const c of deskState.cut) fail.push(`truncated at 1440px: "${c}"`);

  // ---- 4. the phone stage --------------------------------------------------
  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mob = await ph.newPage();
  await mob.goto(base, { waitUntil: "networkidle" });
  await mob.evaluate(() => document.querySelector(".yt-list").scrollIntoView({ block: "center" }));
  await mob.waitForTimeout(500);
  const mobState = await mob.evaluate(() => {
    const st = document.getElementById("ytStage");
    const r = st.getBoundingClientRect();
    const poster = document.getElementById("ytPoster");
    return { ratio: r.width / r.height, tall: st.dataset.tall,
             poster: poster.currentSrc.split("/").slice(-2).join("/") };
  });
  if (Math.abs(mobState.ratio - 9 / 16) > 0.03) {
    fail.push(`the phone stage is ${mobState.ratio.toFixed(2)}:1, not 9:16`);
  }
  if (!mobState.poster.startsWith("tall/")) {
    fail.push(`the phone is showing ${mobState.poster}. <source media> must pick the tall ` +
              "poster, or the still and the video that replaces it are different shapes.");
  }
  /* A PHONE PLAYS IT HERE. For one day this asserted the opposite: a tap opened a
     youtube.com/watch URL, which both mobile platforms hand to the installed YouTube app.
     Owner, 2026-08-22: "why tapping on the videos in mobile view opens the YouTube app??? ...
     they want the video to be [played] on the YouTube player we [have] IN THE WEBSITE".
     Everything around the press is unchanged and matters just as much: the stage is the tall
     cut in a 9:16 frame, because that is the poster a finger lands on. Only the last step moved
     back -- from "where did it take you" to "what did it embed", and LEAVING is now a failure.
     Whether the reader is carried to the player is check-watch-inline's question, on every tile
     rather than on this one. */
  const opened = [];
  ph.on("page", (p) => opened.push(p.url()));
  await mob.evaluate(() => document.getElementById("ytPlay").click());
  await mob.waitForTimeout(700);
  const mobSrc = await mob.evaluate(() => {
    const f = document.querySelector("#ytStage iframe");
    return f ? f.src : "";
  });
  const handoff = opened.find((u) => /youtube\.com/.test(u)) || "";
  if (handoff) {
    fail.push(`a phone pressed play and was sent to ${handoff}. The film plays on this page: a ` +
              "press must not hand the reader to another app.");
  }
  if (!mobSrc) {
    fail.push("a phone pressed play and no player was created at all.");
  } else if (!mobSrc.includes(`/embed/${mobState.tall}`)) {
    fail.push(`a phone pressed play and embedded ` +
              `"${(mobSrc.split("/embed/")[1] || mobSrc).split("?")[0]}". It must embed the Short ` +
              `${mobState.tall}: a 1920x1080 cut in a 9:16 frame is black bars over half the height.`);
  } else {
    note(`phone: 9:16 stage, tall poster, play embeds the Short ${mobState.tall} here`);
  }

  // ---- 6. the negative control ---------------------------------------------
  // Point the phone's stage at the landscape cut and require check 4 to notice. Without this
  // a clean run is equally consistent with a check that read the id it had just written.
  opened.length = 0;
  await mob.evaluate(() => {
    const st = document.getElementById("ytStage");
    const f = st.querySelector("iframe");
    if (f) f.remove();
    st.dataset.tall = st.dataset.wide;
    document.getElementById("ytPlay").hidden = false;
  });
  await mob.evaluate(() => document.getElementById("ytPlay").click());
  await mob.waitForTimeout(600);
  const controlSrc = await mob.evaluate(() => {
    const f = document.querySelector("#ytStage iframe");
    return f ? f.src : "";
  });
  if (!controlSrc || controlSrc.includes(`/embed/${mobState.tall}`)) {
    fail.push("NEGATIVE CONTROL DID NOT FIRE: the phone's stage was repointed at the landscape " +
              `cut and play still embedded ${controlSrc ? "the Short" : "nothing"}, so this check ` +
              "is not reading what play actually puts on the page.");
  } else {
    note("negative control fired: repointing the stage changed which film play embedded");
  }

  await browser.close();
} catch (e) {
  fail.push(String(e && e.message ? e.message : e));
} finally {
  try { server.kill(); } catch {}
}

if (fail.length) {
  console.error(`check-channel FAILED: ${fail.length} problem(s).`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log("check-channel OK: the page and channel.json agree on both cuts of all " +
            `${catalogue.length} films, the posters are the shape they claim, a desktop plays ` +
            "the landscape cut in a 16:9 stage and a phone embeds the Short on this page, and " +
            "the check was proven able to see the wrong cut.");
