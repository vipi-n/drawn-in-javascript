"""Word-level timestamps for the Suno track, written to build/words.json.

    .venv/bin/python tools/transcribe.py
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[1]
PROMPT = ("Good morning team. The AI wrote the code. Woke up at nine with my coffee and my dread. "
          "My CEO on LinkedIn says we're ten-x now. You're absolutely right, it said, and then it deleted prod. "
          "I'm a prompt engineer, formerly known as dev. Tab and Accept, Accept, Accept. Vibe coding. "
          "LeetCode, invert a binary tree. LGTM. JavaScript. Context window exceeded.")


def main():
    pcm = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(ROOT / "song.aifc"), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"])
    audio = np.frombuffer(pcm, dtype=np.float32)
    model = WhisperModel("medium.en", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(audio, word_timestamps=True, initial_prompt=PROMPT,
                                   vad_filter=False, beam_size=5, condition_on_previous_text=False)
    words = []
    for seg in segments:
        print(f"{seg.start:6.2f}-{seg.end:6.2f} {seg.text.strip()}", flush=True)
        words += [{"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 2)} for w in seg.words]
    (ROOT / "build" / "words.json").write_text(json.dumps(words, indent=1))


if __name__ == "__main__":
    main()
