# Code task: re-theme closure pet + skin into "Timeless Nascence"

Read `art/design/character-sheet.md` first (palette, naming, tone).
Work only inside this repository. Do NOT touch `reference/`, `art/keyframes`, `art/cutouts`, or `pet/assets/video`.

## A. Pet (`pet/`)
1. Rename package `dsh-closure-pet` → `dsh-nascence-pet` everywhere (package.json name/description/keywords/repository
   fields — drop the GitHub URLs, set author to "dsh-nascence contributors"; `cordis.patch.yml` id/name; client URL
   prefix `/plugins/dsh-closure-pet/...`; locale files; DOM ids like `#dsh-closure-pet-drag-shield`).
2. Rename storage prefix `dshcl` → `dshtn` (localStorage keys, css classes, `$DSH_HOME/.dshcl.json` → `.dshtn.json`).
3. Replace every user-visible 可露希尔 / Closure / 博士 string with the new character: name 「Nascence」, user addressed
   as 「观测者」. Rewrite `assets/src/config/dialogues.json` completely in her voice: calm, gentle, slightly mischievous,
   cosmic vocabulary (tokens are 星尘, spending = 坍缩进黑洞, valley time = 引力减弱/低潮, peak time = 潮汐高峰,
   low balance = 星尘快耗尽了). Keep every existing key and roughly the same number of lines per key. Include the meme
   line "好宇宙…" in thinkIdle. No references to Arknights characters/lore.
4. Voice: there are no voice files any more. Keep the voice code but default the voice setting to OFF; remove the
   Japanese/Chinese voice manifest expectations from tests if any test requires files under `assets/voice/`.
5. Sound effects: `assets/audio/` is empty. Write `tools/make-sfx.mjs` (pure Node, no deps) that synthesizes
   click.ogg? — Node cannot encode ogg; instead generate `click.wav`, `coin.wav`, `fail.wav`, `turnfail.wav`
   (short soft chiptune blips: click=short high tick, coin=two rising sparkle notes, fail=descending, turnfail=low
   double thud) and update `assets/src/audio.js` to load `.wav`. Run it so the wav files exist.
6. Restyle the pixel bubble / settings panel / hardware plate colors to the palette in the sheet (cobalt/void/
   star-gold) — keep the pixel font and layout.
7. Video clip filenames stay the same (`idle.webm`, `happy.webm`, ... 12 files listed in `assets/src/anim/library.js`).
   Videos are produced separately; do not create placeholders.
8. Update README.md (Chinese) + NOTICE.md: original character fan art generated with AI from the user's references,
   code MIT (derived from dsh-closure-pet, MIT, credit FSYRG), fonts OFL; remove game-asset notices that no longer apply.
9. `npm install` (esbuild only) then `npm run build:client` then `node --test "tests/*.test.mjs"`; fix tests that
   assert old names. All tests must pass.

## B. Skin (`skin/`)
1. Rename `dsh-closure-skin` → `dsh-nascence-skin` (package.json, cordis.patch.yml, locale, settings page title
   「可露希尔主题」→「Nascence 主题」, any ids/classes with closure/clsr prefix → nascence/tmls).
2. Recolor dark + light themes to the palette: dark = void/deep backgrounds, cobalt primary buttons with the bevel
   style kept, cobalt-hi focus, star-gold for warnings/badges, horizon violet for secondary glows. Light theme =
   silver/white backgrounds with cobalt accents.
3. Title bar wordmark `CLSR-TOKEN-BURNER` → `TMLS-EVENT-HORIZON`; sidebar logo text `CLOSURE HARNESS` →
   `NASCENCE HARNESS`; greeting 「终端已就绪，博士！」→「视界已展开，观测者。」 Replace other Closure-specific copy.
4. Keep scanlines, but make them subtler and add an optional faint starfield background (CSS radial-gradient dots,
   toggle in the theme settings page, default on).
5. Icons: leave `src/icons/*.png` for now (they will be replaced later), but recolor at CSS level if they are
   tinted via filters.
6. Run `node tools/build-client.mjs` and, if present, `node tools/preview-settings.mjs out --verify`.

## Deliverable
Commit on your branch with a clear message. Final report: files changed summary, test output tail (pass/fail
counts), anything you could not do.
