# Timeless Nascence — Desk Pet & Skin Design Sheet

## Character (authoritative: `reference/bili_poster-1795563598014.png`)
- Hair: silver-white short bob, wispy ends, a single ahoge; two stacked dark-silver four-pointed star ornaments
  on her left side.
- Eyes: blue iris with a LARGE bright-yellow four-pointed star in each pupil (her signature).
- Outfit: white halter-neck top with bare shoulders; cobalt-blue hooded jacket worn OFF both shoulders, light-blue
  hood lining; a row of silver thorn-tipped hook-loops on a cord across the chest; a THORN BRANCH (briar stem, NOT a
  chain): a thin dark-gunmetal twisted stem with sharp thorns pointing outward at alternating angles, running
  diagonally from under the brooch down across the front to the hem; an arrow-head hook ornament on the sleeve; large
  silver four-pointed star ornaments on the hem; wide sleeves with a silver arrow/hook detail; HANDS VISIBLE (not
  hidden in sleeves), white fingerless glove on one hand, thin blue rings on fingers; white ascot/neckerchief with a
  blue wave pattern and a blue gem brooch; white dress; white knee socks; black loafers.
- Style note: borrow only the ART STYLE of dsh-closure-pet (chibi proportions, thick dark lines, cel shading,
  floating props) — never its character design (no hand-hiding mega sleeves).
- Hair color: pure snow-white silver with faint cool grey shading — never lavender/purple.
- Skin: very pale, cool white like polished marble/porcelain, sacred and statuesque; NO blush, no pink cheeks.
- Mood: pure, flawless, quietly divine — a serene gentle smile (closed or softly parted lips, NO fang, never impish
  or devilish), calm kind eyes; playfulness only in gestures (wink, finger-frame, heart hands, "好宇宙…" spaced-out face).
- Motif: cosmos, black hole with an accretion ring, orbit lines, four-pointed stars, moon, white feathers.

## Chibi pet style (matches dsh-closure-pet)
- ~2.5-head chibi, frontal standing, full body, feet on a small glowing ellipse shadow.
- Thick dark-navy outline (#141a3a), flat cel shading with one shadow tone, glossy big eyes.
- Floating props around her (like Closure's crystal / orb / cube / bat wings):
  1. a mini black hole orb with a bright blue-white accretion ring (upper right)
  2. a faceted four-pointed star crystal (upper left)
  3. a small crescent moon tablet / orbit ring (lower right)
  4. 2–3 tiny white feathers / sparkles drifting
- Canvas 888×748, character centered, ~80% height. Transparent WebM VP9 alpha, 30 fps.

## Palette
| token | hex | use |
|---|---|---|
| void | #0a0e24 | deepest background |
| deep | #111842 | panels |
| cobalt | #2446e0 | jacket, primary accent |
| cobalt-hi | #5b7bff | highlights, focus ring |
| silver | #e8ecf8 | hair, text on dark |
| star-gold | #f5d76e | pupil star, warnings, valley time |
| horizon | #8c6bff | accretion violet, secondary |
| line | #141a3a | outline |

## Actions (clip names required by the state machine)
| clip | duration | content |
|---|---|---|
| Idle | ~1.5s loop | breathing, blink, props bob |
| Happy | ~2.8s | closes eyes, smiles, both sleeves up |
| Talk | ~5s loop | mouth open/close, small head tilt, one sleeve gesture |
| Interact_1 | ~2.4s | wink + finger-frame ("camera") gesture |
| Interact_2 | ~2.2s | heart hands, blush |
| Celebrate | ~2s | jump with sparkles burst, black hole ring spins |
| Sad_Begin / Sad_Idle / Sad_Exit | 2.6 / 2.1 / 2.6s | hugs knees-ish slump, droopy eyes, props dim |
| Think_Begin / Think_Idle / Think_Exit | 1.6 / 2.1 / 1.6s | hand on cheek, spaced-out "好宇宙…" eyes, orbit lines |

## Naming
- Pet package: `dsh-nascence-pet`, storage prefix `dshtn`, config file `$DSH_HOME/.dshtn.json`.
- Skin package: `dsh-nascence-skin`; title bar wordmark `TMLS-EVENT-HORIZON`; sidebar logo `NASCENCE HARNESS`.
- User is addressed as 「观测者」.
