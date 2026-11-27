# Gemini task: voice review (audio)

Listen to:
- `art/voice/ref/audio.mp3` — the audio track of the reference video `videoreference.mp4` (the character speaks here).
- `art/voice/candidates/voice_lively_1.mp3`, `voice_lively_2.mp3` — designed voices, "girlish and lively" direction.
- `art/voice/candidates/voice_serene_1.mp3`, `voice_serene_2.mp3`, `voice_serene_3.mp3` — earlier "calm/serene" direction.
All candidates read the same Mandarin text (a greeting to 「管理员」, a thinking line, a happy line).

The client says the character's voice should be girlish and lively (少女感、很活泼), close in spirit to a bright,
playful anime heroine. We do NOT clone the video's voice actor; we design an original voice with similar qualities.

Write exactly one file, `art/voice/voice-review.md`, containing:
1. A precise description of the voice in `ref/audio.mp3`: apparent age, pitch, timbre, pace, energy, breathiness,
   articulation, emotional colour, any distinctive habits. If there is no speech, say so.
2. For each of the 5 candidates: a score 1–10 for fit to the client's direction + the reference voice's qualities,
   and concrete problems (too old/young, too flat, accent issues, pronunciation errors, artifacts, etc.).
3. The best candidate, and whether it is good enough or needs another round.
4. An improved ElevenLabs Voice Design prompt (English, <= 600 chars) describing qualities only (no names of real
   people or characters) that would move the voice closer.
Do not modify any other file.
