# UI overhaul task: Timeless Nascence design language (skin + pet UI)

The client wants the whole UI to follow the design language of the reference video (`videoreference.mp4`, frames in
`art/voice/ref/frames/`, splash still `art/inbox/_splash_frame.jpg` if present): **navy, black and white; minimalist;
technological and sacred.** Replace the current Closure-era CRT / pixel / bevel / purple language completely.
Read `art/design/character-sheet.md` for naming. Work only in `skin/` and `pet/assets/src/ui/` (+ tests as needed).

## Design tokens
Dark (default):
- `--tn-void` #05070f (app background), `--tn-navy` #0b1430 (panels), `--tn-navy-2` #111c40 (raised/hover),
  `--tn-line` rgba(232,238,255,0.08) (hairlines), `--tn-line-strong` rgba(232,238,255,0.18)
- `--tn-text` #eef2ff, `--tn-text-dim` #8f9abb, `--tn-white` #ffffff, `--tn-silver` #c9d1e6
- `--tn-accent` #3d6bff (cobalt, used sparingly: focus, active, links, one glow), `--tn-accent-glow` rgba(61,107,255,0.35)
Light:
- background #f6f7fb, panels #ffffff, hairlines rgba(11,20,48,0.08), text #0b1430, dim #5b6480, accent #2148e8.

## Visual rules
1. Minimalism: flat surfaces, 1px hairline borders, generous spacing, radius 6px (inputs/buttons) / 10px (cards).
   No scanlines, no CRT glow, no bevel/clipped corners, no pixel-art icons, no purple anywhere.
2. One signature motif — a **thin horizontal light streak** (1px gradient transparent → cobalt → white → transparent)
   under the title bar and as the divider on the welcome hero. Optional very faint starfield (default OFF).
3. Typography: UI `"Inter","HarmonyOS Sans SC","PingFang SC","Microsoft YaHei UI",system-ui,sans-serif`;
   small uppercase metadata/labels in mono `"JetBrains Mono","Cascadia Mono",monospace` with 0.12em tracking.
   Title-bar caption "Timeless Nascence": weight 300, letter-spacing 0.35em, white, no uppercase transform.
   Remove the pixel font as a default (keep the option in settings if it exists, default to the sans stack).
4. Buttons: primary = solid white with navy text (dark theme) / navy with white text (light theme); hover adds the
   cobalt glow ring; secondary = transparent with hairline border. Inputs: navy fill, hairline, cobalt focus ring.
5. Icons: stop replacing DSH's native icons with pixel PNGs (remove those overrides). Keep only the new emblem logos
   `src/icons/logo-glow.png` / `guide-hero.png` (already regenerated: ∞ + compass-star seal).
6. Sidebar / settings / chat bubbles / code blocks: navy panels on void, hairline separators, white text, cobalt for
   the active item indicator (a 2px vertical bar), no heavy shadows.
7. Keep: settings page structure and the existing options that still make sense; the welcome hero line
   「来探索新的宇宙吧，管理员」; caption text "Timeless Nascence"; sidebar brand text may become "TIMELESS NASCENCE".

## Startup splash (new)
- Asset: `skin/assets/splash.webm` (1440×480, 3.9 s, VP9 + Opus, from the reference video: hands release the silver ∞
  around the black hole). Serve it from the skin host (`skin/lib/index.js`) e.g. `GET /dsh-nascence-skin/assets/splash.webm`
  with `Content-Type: video/webm` (support `Range` requests if simple; otherwise full body is fine). Include `assets/`
  in package.json `files`.
- On the first client load of each app session (sessionStorage flag), show a full-window overlay: black background,
  the video centered with `object-fit: cover`, muted by default. After the video ends (or after 4.2 s max), fade in the
  caption "Timeless Nascence" in thin tracked white text with the light-streak line beneath, hold 0.6 s, then fade the
  whole overlay out over 0.5 s. Click or Esc skips. If the video fails to load, skip silently.
- Theme settings page: add toggles 「启动动画」(default on) and 「启动动画声音」(default off, unmutes the video).

## Pet UI (`pet/assets/src/ui/`)
Restyle bubble, right-click panel, hardware plate, valley sticker and the DSH settings page section to the same
tokens: minimal white card (light) / navy card (dark) with hairline border, 8px radius, sans font by default (keep the
pixel font only as an option, default off), cobalt accent for highlights, no pixel borders. Keep all behaviour.

## Verify
- `cd skin && node tools/build-client.mjs` and `node tools/preview-settings.mjs out --verify` if it works.
- `cd pet && npm run build:client && node --test "tests/*.test.mjs"` — all tests must pass (update tests that assert
  old colors/fonts/labels only where the change is intended).
- Commit on your branch. Final report: summary of changes, test output tail, anything not done.
