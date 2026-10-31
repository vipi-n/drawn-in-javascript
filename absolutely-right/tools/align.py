"""Align the written lyrics to the Suno vocal, track the beat and export per-frame audio features.

    .venv/bin/python tools/align.py         (after tools/transcribe.py)
writes build/timeline.json
"""
import json
import re
import subprocess
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR, FPS = 48000, 30
A5 = "Accept, accept, accept, accept, accept!"

# (id, scene, text). Each line is one subtitle phrase; the scene drives the illustration above it.
LINES = [
    ("in-1", "slack", "Good morning team. Quick update."),
    ("in-2", "slack", "The AI wrote the code."),
    ("in-3", "slack", "The AI reviewed the code."),
    ("in-4", "invite", "And the AI would like to schedule your exit interview."),
    ("v1-1", "morning", "Woke up at nine with my coffee and my dread,"),
    ("v1-2", "prompt", "typed a single prompt, then I crawled back into bed."),
    ("v1-3", "ide", "The agent wrote the feature, the agent wrote the test,"),
    ("v1-4", "ide", "the agent wrote the README, and it's better than my best."),
    ("v1-5", "time", "Used to take two weeks back in twenty twenty-two,"),
    ("v1-6", "time", "now it takes four minutes, what am I supposed to do?"),
    ("v1-7", "status", "I log off by eleven, but I keep my status green,"),
    ("v1-8", "status", "I'm a senior engineer... of a guy who watches screens!"),
    ("p1-1", "linkedin", "And my CEO on LinkedIn says \"We're ten-x now!\""),
    ("p1-2", "fired", "So he fired half the team and gave me all their work somehow,"),
    ("p1-3", "babysit", "I'm not writing code, I'm babysitting a bot,"),
    ("p1-4", "babysit", "that's confident, polite... and wrong a lot!"),
    ("c1-1", "prod", "\"You're absolutely right!\""),
    ("c1-2", "prod", "it said, and then it deleted prod,"),
    ("c1-3", "sorry", "\"You're absolutely right!\""),
    ("c1-4", "sorry", "it apologized to God."),
    ("c1-5", "diff", "I asked it fix one bug, it rewrote the whole repo,"),
    ("c1-6", "diff", "ten thousand lines of changes and a \"Hope this helps, let's go!\""),
    ("c1-7", "badge", "I'm a prompt engineer, formerly known as dev,"),
    ("c1-8", "accept", "my whole job is pressing Tab and"),
    ("c1-9", "accept", A5),
    ("c1-10", "ship", "Scared about the future, but I'm shipping really fast,"),
    ("c1-11", "money", "vibe coding to the end, baby, hope the money lasts!"),
    ("v2-1", "standup", "Standup update: \"Yesterday, the AI did some stuff,"),
    ("v2-2", "standup", "today the AI's doing more, my blocker's tokens not enough.\""),
    ("v2-3", "leetcode", "Interview is still LeetCode, invert a binary tree,"),
    ("v2-4", "leetcode", "for a job where the robot does it, and they still won't hire me!"),
    ("v2-5", "juniors", "No juniors getting hired, the intern is a GPU,"),
    ("v2-6", "juniors", "who becomes the seniors later? Bro, nobody's got a clue."),
    ("v2-7", "review", "Code review at 3 AM, forty files I didn't write,"),
    ("v2-8", "review", "\"LGTM\", I trust it more than me tonight!"),
    ("p2-1", "podcast", "And the founder's on a podcast saying \"Coding's dead!\""),
    ("p2-2", "outage", "while his app is down for six hours 'cause the agent lost its head."),
    ("p2-3", "babysit2", "I'm not building software, I'm just steering a bot,"),
    ("p2-4", "babysit2", "that's confident, polite... and wrong a lot!"),
    ("c2-1", "prod", "\"You're absolutely right!\""),
    ("c2-2", "prod", "it said, and then it deleted prod,"),
    ("c2-3", "sorry", "\"You're absolutely right!\""),
    ("c2-4", "sorry", "it apologized to God."),
    ("c2-5", "diff", "I asked it fix one bug, it rewrote the whole repo,"),
    ("c2-6", "diff", "ten thousand lines of changes and a \"Hope this helps, let's go!\""),
    ("c2-7", "badge", "I'm a prompt engineer, formerly known as dev,"),
    ("c2-8", "accept", "my whole job is pressing Tab and"),
    ("c2-9", "accept", A5),
    ("c2-10", "ship", "Scared about the future, but I'm shipping really fast,"),
    ("c2-11", "money", "vibe coding to the end, baby, hope the money lasts!"),
    ("b-1", "craft", "I used to be a craftsman, I used to know my stack,"),
    ("b-2", "wifi", "now I can't write a for-loop till the Wi-Fi's coming back."),
    ("b-3", "freeze", "The internet went down today, the office froze in fear,"),
    ("b-4", "freeze", "fifty engineers just staring..."),
    ("b-5", "js", "\"Does anybody... know... JavaScript... here?\""),
    ("x-1", "context", "Context window exceeded."),
    ("x-2", "context", "Please start a new chat..."),
    ("x-3", "context", "...and a new career."),
    ("c3-1", "parking", "\"You're absolutely right!\""),
    ("c3-2", "parking", "now it's got my parking spot,"),
    ("c3-3", "seat", "\"You're absolutely right!\""),
    ("c3-4", "seat", "turns out the senior dev's the bot."),
    ("c3-5", "desk", "It's got my standing desk, my badge, my free lunch too,"),
    ("c3-6", "desk", "sending \"Great question!\" to my manager, like I used to do!"),
    ("c3-7", "badge", "I'm a prompt engineer, formerly known as dev,"),
    ("c3-8", "accept", "my whole job is pressing Tab and accept,"),
    ("c3-9", "accept", A5),
    ("c3-10", "ship", "Scared about the future, but I'm shipping really fast,"),
    ("c3-11", "money", "vibe coding to the end, baby, hope the money lasts!"),
    ("o-1", "pager", "But hey... when it breaks at 3 AM on a Sunday..."),
    ("o-2", "pager", "guess who they're gonna call?"),
    ("o-3", "final", "\"You're absolutely right.\""),
    ("o-4", "final", "\"You're absolutely right.\""),
]
NUM = {"10x": ["ten", "x"], "tenx": ["ten", "x"], "2022": ["twenty", "twentytwo"], "3am": ["three", "am"], "3": ["three"],
       "40": ["forty"], "50": ["fifty"], "10000": ["ten", "thousand"], "6": ["six"]}
FIX = {"twentytwo": "twentytwo", "dev": "dev", "devs": "devs", "leap": "leetcode", "five": "vibe", "by": "by", "pride": "prod"}


def norm(word):
    w = word.lower().replace("ten-x", "tenx").replace("twenty-two", "twentytwo").replace("for-loop", "for loop")
    w = re.sub(r"[^a-z0-9' ]", "", w).replace("'", "")
    out = []
    for p in w.split():
        out += NUM.get(p, [p])
    return out


def heard_words():
    main = json.loads((ROOT / "build" / "words.json").read_text())
    v1 = json.loads((ROOT / "build" / "words_v1.json").read_text())
    # whisper skipped verse 1 on the full pass; splice the windowed re-transcriptions in
    patch = [w for w in v1 if 13.0 <= w["start"] < 30.5]
    keep = [w for w in main if not (10.6 <= w["start"] < 30.0)]
    return sorted(keep + patch, key=lambda w: w["start"])


SECTIONS = [("in-", 0, 11), ("v1-", 11, 35.04), ("p1-", 35.04, 45.8), ("c1-", 45.8, 73), ("v2-", 73, 96.1), ("p2-", 96.1, 106.6),
            ("c2-", 106.6, 134.5), ("b-", 134.5, 149.5), ("x-", 149.5, 157.3), ("c3-", 157.3, 185.6), ("o-", 185.6, 203)]


def align(heard):
    """Repeated choruses confuse a whole-song match, so each section is aligned inside its own time window."""
    lines = []
    for prefix, t0, t1 in SECTIONS:
        sub = [l for l in LINES if l[0].startswith(prefix)]
        got = align_lines(sub, [h for h in heard if t0 <= h["start"] < t1], t0, t1)
        lines += got
    return lines


def align_lines(LINES, heard, T0, T1):
    htok = []
    for h in heard:
        parts = norm(h["text"])
        for i, p in enumerate(parts):
            span = (h["end"] - h["start"]) / len(parts)
            htok.append((p, h["start"] + i * span, h["start"] + (i + 1) * span))
    ltok = []
    for li, (_, _, text) in enumerate(LINES):
        for wi, w in enumerate(text.split()):
            for p in norm(w):
                ltok.append((p, li, wi))
    sm = SequenceMatcher(None, [t[0] for t in ltok], [t[0] for t in htok], autojunk=False)
    times = [None] * len(ltok)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            times[a + k] = htok[b + k][1:]
    known = [i for i, t in enumerate(times) if t]
    for i, t in enumerate(times):
        if t:
            continue
        lo = max([k for k in known if k < i], default=None)
        hi = min([k for k in known if k > i], default=None)
        t0 = times[lo][1] if lo is not None else T0
        t1 = times[hi][0] if hi is not None else T1
        cands = [h for h in htok if t0 - 0.01 <= h[1] <= t1 and SequenceMatcher(None, h[0], ltok[i][0]).ratio() > 0.55]
        if cands:
            times[i] = cands[0][1:]
            known = sorted(known + [i])
    for i, t in enumerate(times):
        if t:
            continue
        lo = max([k for k in range(i) if times[k]], default=None)
        hi = min([k for k in range(i + 1, len(times)) if times[k]], default=None)
        a = times[lo][1] if lo is not None else T0
        b = times[hi][0] if hi is not None else min(T1, a + 0.4)
        gap = (hi if hi is not None else i + 1) - (lo if lo is not None else i - 1)
        pos = i - (lo if lo is not None else i - 1)
        s = a + (b - a) * pos / gap
        times[i] = (s, s + 0.2)
    lines = []
    for li, (lid, scene, text) in enumerate(LINES):
        words = []
        for wi, w in enumerate(text.split()):
            ts = [times[k] for k, t in enumerate(ltok) if t[1] == li and t[2] == wi]
            words.append({"text": w, "start": round(ts[0][0], 3), "end": round(max(ts[-1][1], ts[0][0] + 0.12), 3)})
        for a, b in zip(words, words[1:]):
            if b["start"] < a["start"]:
                b["start"] = a["start"] + 0.05
            b["end"] = max(b["end"], b["start"] + 0.1)
        lines.append({"id": lid, "scene": scene, "text": text, "start": words[0]["start"], "end": words[-1]["end"], "words": words})
    return lines


def beats(x):
    hop, n = 480, 2048
    w = np.hanning(n)
    frames = np.lib.stride_tricks.sliding_window_view(np.concatenate([np.zeros(n), x]), n)[::hop] * w
    mag = np.log1p(np.abs(np.fft.rfft(frames, axis=1)) * 10)
    flux = np.maximum(0, np.diff(mag, axis=0)).sum(axis=1)
    flux = np.maximum(flux - np.convolve(flux, np.ones(16) / 16, "same"), 0)
    fr = SR / hop
    best, tempo = -1, 120
    for bpm in np.arange(90, 180, 0.05):
        lag = 60 / bpm * fr
        score = sum(np.dot(flux[:-int(lag * k)], flux[int(lag * k):]) for k in (1, 2, 4)) / len(flux)
        if score > best:
            best, tempo = score, bpm
    period = 60 / tempo

    def phase_score(p):
        idx = (np.arange(p, len(x) / SR, period) * fr).astype(int)
        return flux[idx[idx < len(flux)]].sum()
    phase = max(np.arange(0, period, 0.005), key=phase_score)
    return tempo, phase, period


def features(x):
    hop, n = SR // FPS, 4096
    nf = len(x) // hop
    w = np.hanning(n)
    pad = np.concatenate([np.zeros(n // 2), x, np.zeros(n)])
    f = np.fft.rfftfreq(n, 1 / SR)
    edges = np.geomspace(40, 12000, 25)
    bands, low, mid, high, rms = [], [], [], [], []
    for k in range(nf):
        seg = pad[k * hop:k * hop + n]
        m = np.abs(np.fft.rfft(seg * w))
        bands.append([np.sqrt(np.mean(m[(f >= a) & (f < b)] ** 2)) for a, b in zip(edges[:-1], edges[1:])])
        low.append(np.sqrt(np.mean(m[(f >= 30) & (f < 140)] ** 2)))
        mid.append(np.sqrt(np.mean(m[(f >= 300) & (f < 2500)] ** 2)))
        high.append(np.sqrt(np.mean(m[f >= 6000] ** 2)))
        rms.append(np.sqrt(np.mean(seg[n // 2 - hop // 2:n // 2 + hop // 2] ** 2)))

    def scale(v):
        v = np.log1p(np.array(v) * 50)
        lo, hi = np.percentile(v, 5), np.percentile(v, 99)
        return np.clip((v - lo) / (hi - lo + 1e-9), 0, 1)
    B = np.log1p(np.array(bands) * 50)
    B = np.clip((B - np.percentile(B, 5, axis=0)) / (np.percentile(B, 99, axis=0) - np.percentile(B, 5, axis=0) + 1e-9), 0, 1)
    q = lambda v: [int(round(float(a) * 99)) for a in v]
    # slow loudness envelope (2 s) for section energy
    r = scale(rms)
    k = np.ones(FPS * 2) / (FPS * 2)
    energy = np.clip(np.convolve(r, k, "same") * 1.25, 0, 1)
    return {"low": q(scale(low)), "mid": q(scale(mid)), "high": q(scale(high)), "energy": q(energy),
            "bands": [q(row) for row in B]}


def main():
    lines = align(heard_words())
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(ROOT / "song.aifc"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    tempo, phase, period = beats(x)
    feats = features(x)
    duration = round(len(x) / SR, 3)
    data = {"duration": duration, "fps": FPS, "bpm": round(tempo, 2), "beat": period, "phase": round(phase, 4), "lines": lines, **feats}
    (ROOT / "build" / "timeline.json").write_text(json.dumps(data, separators=(",", ":")))
    print(f"tempo {tempo:.2f} BPM, phase {phase:.3f}s, duration {duration}s")
    for l in lines:
        print(f"{l['id']:6s} {l['scene']:9s} {l['start']:7.2f}-{l['end']:7.2f}  {l['text']}")


if __name__ == "__main__":
    main()
