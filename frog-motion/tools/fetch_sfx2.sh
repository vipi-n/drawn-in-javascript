#!/bin/zsh
# Extra CC0 BigSoundBank recordings (Joseph Sardin) for the v2 sound design: real splashes, drops, bubbles, a fly,
# a field cricket, dawn birds and countryside. -> frog-motion/assets/sfx2
set -e
mkdir -p "${0:A:h}/../assets/sfx2"
cd "${0:A:h}/../assets/sfx2"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
for p in splash-small-1-s1529 splash-small-2-s1530 splash-small-3-s1531 splash-small-4-s1532 splash-small-5-s1533 splash-small-6-s1534 \
  splash-big-1-s1519 splash-big-2-s1520 splash-big-3-s1521 drops-1-s1384 drops-2-s1385 drops-3-s1386 drops-4-s1387 \
  water-bubbles-s0150 airlock-1-s3560 sparkling-s0230 fly-s0759 flies-s0101 cricket-s1020 birds-waking-s1906 countryside-s0097 \
  blackbird-s3503 robin-s1667 bumblebee-s1000
do
  id=${p##*-s}
  name=${p%-s*}
  out="$id-$name.mp3"
  if [[ ! -s $out ]] || ! ffprobe -v error "$out" 2>/dev/null; then
    curl -sL -A "$UA" -o "$out" "https://bigsoundbank.com/UPLOAD/mp3/$id.mp3?v=d"
  fi
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out" 2>/dev/null || echo BAD)
  echo "$out $dur"
done
