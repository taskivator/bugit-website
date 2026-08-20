// The ground has no contours in it, on a 4K screen.
//
// WHY THIS EXISTS. The background looked "low quality" on a 3840x2160 monitor and looked fine
// on every laptop it had ever been reviewed on. Both were true, and the reason is arithmetic
// rather than taste.
//
//   sRGB has 256 levels per channel. The ground travels about 25 of them from the top of the
//   page to the bottom. On a 2160px-tall screen that is one level every ~90 pixels, and the
//   eye is very good at finding the edge of a 90px plateau: it reads as a band. The same
//   gradient on a 900px laptop steps every ~36px and mostly hides in the noise floor of the
//   panel. So the defect is invisible exactly where it is usually looked at.
//
// The remedy is a dither -- a blue-noise tile over the ground, which turns a hard step into a
// sprinkle -- plus removing the two things that ENDED on screen: gradients whose last stop
// landed mid-viewport, and blooms drawn as solid discs blurred by a fixed 120px, which at 4K
// is a rim rather than a falloff.
//
// WHAT IS MEASURED. Not colours, and not "smoothness": the WIDTH OF THE PLATEAUS. How far can
// you travel across the ground before the colour changes at all? A dithered gradient holds a
// colour for a pixel or two; a banded one holds it for as long as the band is wide. The
// threshold here is 24px, which is far wider than anything dithering leaves behind and far
// narrower than the 285px plateau this page shipped with.
//
// Content is hidden and the blooms are frozen, because this is a measurement of the GROUND.
// A panel is allowed to be flat -- that is what a panel is.
//
// The negative control restores the ENTIRE ground that shipped -- old gradients, solid discs,
// 120px blur, no dither -- and requires this file to fail against it. That mutation reproduces
// the original defect exactly: 293px plateaus, against 285px measured on the real page before
// any of this was changed. Removing only the dither tile is NOT a sufficient control, and
// finding that out was worth the detour: Skia dithers CSS gradients on its own, so a ground
// built from gradients alone measures clean either way. What it does not dither is the output
// of a filter, which is why the blurred discs had to go rather than be blurred harder.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const note = (m) => console.log("  " + m);

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
const base = `http://127.0.0.1:${PORT}`;

// The screenshot comes back as PNG bytes; the page itself decodes them. A canvas fed a
// same-origin data: URL is not tainted, so getImageData is allowed, and that saves carrying a
// PNG decoder in here to measure six lines of pixels.
const PLATEAUS = `(async (b64) => {
  const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const c = new OffscreenCanvas(img.width, img.height);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const { data, width: W, height: H } = g.getImageData(0, 0, img.width, img.height);
  const at = (x, y) => { const i = (y * W + x) * 4; return (data[i] << 16) | (data[i+1] << 8) | data[i+2]; };
  const runsOf = (seq) => {
    const out = []; let start = 0;
    for (let i = 1; i <= seq.length; i++) {
      if (i === seq.length || seq[i] !== seq[start]) { out.push(i - start); start = i; }
    }
    return out;
  };
  const lines = [
    ['vertical x=W/6',   Array.from({length: H}, (_, y) => at(Math.floor(W/6), y))],
    ['vertical x=W/2',   Array.from({length: H}, (_, y) => at(Math.floor(W/2), y))],
    ['vertical x=5W/6',  Array.from({length: H}, (_, y) => at(Math.floor(5*W/6), y))],
    ['horizontal y=H/8', Array.from({length: W}, (_, x) => at(x, Math.floor(H/8)))],
    ['horizontal y=H/3', Array.from({length: W}, (_, x) => at(x, Math.floor(H/3)))],
    ['diagonal',         Array.from({length: 2000}, (_, i) => at(Math.floor(i*(W-1)/2000), Math.floor(i*(H-1)/2000)))],
  ];
  return lines.map(([name, seq]) => {
    const runs = runsOf(seq);
    const longest = Math.max(...runs);
    const wide = runs.filter((r) => r >= 24);
    return { name, longest, wide: wide.length, colours: new Set(seq).size, samples: seq.length };
  });
})`;

async function groundLines(page, { asShipped }) {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.evaluate((keepCurrent) => {
    const b = document.getElementById("consentBanner"); if (b) b.remove();
    // Measure the GROUND: everything else comes off, and the blooms are frozen so two runs of
    // this file are comparable.
    document.querySelectorAll("body > *:not(#ambient)").forEach((el) => { el.style.visibility = "hidden"; });
    document.querySelectorAll("#ambient .aurora, .aurora-sweep").forEach((el) =>
      el.getAnimations().forEach((a) => { a.currentTime = 0; a.pause(); }));
    if (!keepCurrent) {
      // THE CONTROL PUTS THE OLD GROUND BACK. Removing the dither alone is not enough to
      // prove anything, and finding that out was the useful part: Skia dithers CSS gradients
      // by itself, so a page built only from gradients measures clean with or without a grain
      // tile. What it does NOT dither is the output of a filter. The ground that shipped drew
      // its blooms as solid discs behind filter:blur(120px), and THAT is where the 285px
      // plateaus came from. So the control restores exactly that -- a blurred disc, and no
      // dither over it -- which is the shape of the defect this file exists to catch.
      const kill = document.createElement("style");
      kill.textContent = `
        #ambient::after{display:none!important}
        #ambient::before{display:none!important}
        #ambient .aurora.a::after{display:none!important}
        #ambient{background:
          radial-gradient(120% 62% at 50% -12%,rgba(139,69,255,.20),transparent 62%),
          radial-gradient(72% 44% at 84% 4%,rgba(255,79,201,.14),transparent 66%),
          linear-gradient(180deg,#07050f 0%,#05040b 42%,#06040d 100%)!important}
        #ambient .aurora{
          border-radius:50%!important;
          filter:blur(120px)!important;
          mix-blend-mode:screen!important;
        }
        #ambient .aurora.a{
          background:#ff2e9a!important;opacity:.13!important;
          left:-16vw!important;top:-24vh!important;width:64vw!important;height:52vw!important;
        }
        #ambient .aurora.b{
          background:#7b3bff!important;opacity:.15!important;
          right:-20vw!important;left:auto!important;top:-10vh!important;bottom:auto!important;
          width:56vw!important;height:48vw!important;
        }`;
      document.head.appendChild(kill);
    }
  }, asShipped);
  await page.waitForTimeout(350);
  const shot = await page.screenshot({ type: "png" });
  return page.evaluate(`(${PLATEAUS})(${JSON.stringify(shot.toString("base64"))})`);
}

try {
  const browser = await chromium.launch();
  // 3840x2160 at deviceScaleFactor 1: one image pixel is one monitor pixel, which is the only
  // scale at which this defect exists.
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });

  const lines = await groundLines(page, { asShipped: true });
  for (const l of lines) {
    note(`${l.name.padEnd(16)} longest plateau ${String(l.longest).padStart(4)}px   ` +
         `${l.colours} colours across ${l.samples}px`);
    if (l.wide > 0) {
      fail.push(`${l.name}: ${l.wide} plateau(s) of 24px or more, longest ${l.longest}px. ` +
                "That is a contour line on a 4K screen.");
    }
  }
  const worst = Math.max(...lines.map((l) => l.longest));
  note(`worst plateau anywhere: ${worst}px (the page shipped with 285px)`);

  // ---- the negative control ------------------------------------------------
  const bare = await groundLines(page, { asShipped: false });
  const bareWide = bare.reduce((n, l) => n + l.wide, 0);
  if (bareWide === 0) {
    fail.push("NEGATIVE CONTROL DID NOT FIRE: the ground that shipped was put back and still " +
              "measured clean, so this check cannot see banding and proves nothing.");
  } else {
    note(`negative control fired: the ground as it shipped measures ${bareWide} plateaus ` +
         `of 24px+ (longest ${Math.max(...bare.map((l) => l.longest))}px)`);
  }

  await browser.close();
} catch (e) {
  fail.push(String(e && e.message ? e.message : e));
} finally {
  try { server.kill(); } catch {}
}

if (fail.length) {
  console.error(`check-ground FAILED: ${fail.length} problem(s).`);
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log("check-ground OK: at 3840x2160 no sample line across the ground holds a single " +
            "colour for 24px, and putting the old ground back was proven to bring the " +
            "banding straight back.");
