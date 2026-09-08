# Mido Barber assets — ALL PLACEHOLDERS

Every file in this folder is a **flat grey PNG** generated at the correct
dimensions. None of them is real artwork, and none of them is Fünf Sterne's
artwork — shipping another shop's owner portrait inside this app would be
worse than shipping a grey rectangle.

Replace all five before anyone outside the team installs this build.

| File | Size | Where it appears |
|---|---|---|
| `icon.png` | 1024×1024 | Home-screen app icon; also the mark on the sign-in and sign-up screens |
| `splash-owner.png` | 1284×2778 | Native splash, the `EditorialIntro` background, and the home hero |
| `favicon.png` | 48×48 | Web build only |
| `android-icon-foreground.png` | 432×432 | Android adaptive-icon foreground |
| `android-icon-monochrome.png` | 432×432 | Android themed icon |

## What the intro needs from `splash-owner.png`

The opening is **type-led**, so it already reads as finished with the grey
placeholder — that was a design constraint, not an accident. When you drop in
a real photograph it becomes depth rather than becoming the design.

For it to sit well:

- **Portrait orientation**, roughly 9:19.5. It is rendered `cover` with the
  focal point at 28% from the top, so the subject's face or the main subject
  should sit in the upper third.
- **Dark or mid-dark.** A heavy scrim is laid over it (deep at the top and
  bottom, lighter across the middle third where the wordmark sits). A bright
  image will still work but will lose contrast against the gold.
- **Low visual noise in the middle band.** That is where the monogram,
  wordmark, divider and tagline sit. An interior shot with soft falloff
  works far better than a busy one.
- Good subjects: the shop interior with warm lighting, a chair in shallow
  focus, a hands-at-work detail. Avoid barber-pole clipart, stock cartoons,
  and anything with text baked into it.

`icon.png` and `splash-owner.png` are also referenced from `../src/brand.ts`.
Keep the filenames or update that file too.

## Regenerating placeholders

If you need a fresh set at these dimensions, the generator used is recorded
in the session that created this folder; any flat PNG at the right size will
do in the meantime. The only hard requirement is that the dimensions match —
Expo validates the icon is square, and a wrongly-sized splash is letterboxed.
