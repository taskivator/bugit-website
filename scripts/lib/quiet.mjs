/*
 * THE SUITE DOES NOT MAKE NOISE.
 *
 * Owner, 2026-08-29: "the youtube videos are still ALL running suddently during the suite can
 * you at least run them muted?? so it doesnt jump scare me all the time".
 *
 * Two guards press play on a real YouTube embed with the player host reachable -- check-channel
 * (which cut does this screen get) and check-watch-inline (does a tap keep the reader here, and
 * does a film actually start). Both have to play a real film to make their assertion, and a run
 * of the suite therefore fires several of them at whatever the machine's volume happens to be,
 * with no warning. The local demo videos on the page are already `muted` in the markup; these
 * are not, because they are YouTube's player in a cross-origin frame and the page has no say.
 *
 * WHAT IS MUTED, AND WHAT IS DELIBERATELY NOT. The audio OUTPUT is silenced. The player's own
 * muted state is left completely alone, because check-watch-inline distinguishes "the film
 * started with sound" from "the platform refused and the page recovered by muting it", and that
 * distinction is a real assertion about the page's recovery path. Overriding `muted` would erase
 * it. So `volume` is pinned to 0 instead: the autoplay policies that matter read `muted`, not
 * `volume`, so nothing about what is being tested changes -- only whether the room hears it.
 *
 * Chromium also gets --mute-audio, which silences the whole browser process at the OS level and
 * is not observable from inside the page at all. WebKit has no equivalent switch, which is why
 * the init script exists as well: it reaches every frame in the context, cross-origin ones
 * included, so it covers the engine the flag cannot.
 *
 * Set SUITE_AUDIO=1 to hear them.
 */

export const AUDIBLE = process.env.SUITE_AUDIO === "1";

/** Launch options for an engine. Chromium gets a real mute switch; nothing else has one. */
export function quietLaunch(engineName = "chromium", options = {}) {
  if (AUDIBLE || engineName !== "chromium") return options;
  return { ...options, args: [...(options.args ?? []), "--mute-audio"] };
}

/**
 * Silence every media element in every frame of a context, including cross-origin ones.
 *
 * Must be called BEFORE the first navigation: an init script runs at document start, so a
 * context that has already loaded the page will not have it.
 */
export async function hush(context) {
  if (AUDIBLE) return;
  await context.addInitScript(() => {
    try {
      const proto = HTMLMediaElement.prototype;
      const native = Object.getOwnPropertyDescriptor(proto, "volume");
      if (!native || !native.set || !native.get) return;

      /* CALL THE NATIVE SETTER. The first version of this defined a getter that returned 0 and
         a setter that did nothing, which does not lower the volume -- it only lies about it.
         The element keeps its default volume of 1 and plays at full blast, and the probe that
         "confirmed" the mute was reading the fake getter. It looked right in Chromium purely
         because --mute-audio was silencing that engine anyway, and WebKit, which has no such
         flag, was still audible. A silence that is only reported is not silence. */
      const silence = (el) => {
        try {
          native.set.call(el, 0);
        } catch {
          /* Some elements refuse; not worth failing a guard over. */
        }
      };

      Object.defineProperty(proto, "volume", {
        configurable: true,
        get() {
          return native.get.call(this);
        },
        set() {
          // Whatever the player asks for, it gets zero. `muted` is deliberately untouched:
          // autoplay policies read `muted`, not `volume`, so nothing under test changes.
          native.set.call(this, 0);
        },
      });

      /* AND THE ELEMENTS THAT NEVER ASSIGN IT. volume defaults to 1, so a player that simply
         never touches the property would never go through the setter above. Both entry points
         into playback are covered instead of assuming which one YouTube uses. */
      const play = proto.play;
      proto.play = function () {
        silence(this);
        return play.apply(this, arguments);
      };
      document.addEventListener(
        "loadstart",
        (e) => {
          if (e.target instanceof HTMLMediaElement) silence(e.target);
        },
        true,
      );
      document.addEventListener(
        "play",
        (e) => {
          if (e.target instanceof HTMLMediaElement) silence(e.target);
        },
        true,
      );
    } catch {
      /* A frame that will not allow the override is not worth failing a guard over. */
    }
  });
}
