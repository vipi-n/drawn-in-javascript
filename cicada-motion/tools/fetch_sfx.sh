#!/bin/zsh
# CC0 BigSoundBank recordings used for the cicada sound design -> cicada-motion/assets/sfx
set -e
cd "${0:A:h}/../assets/sfx"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
for p in cicada-1-long-s2397 cicada-1-s2246 cicada-1-short-s2396 cicada-2-long-s2399 cicada-2-s2247 cicada-2-short-s2398 cicadas-s3002 \
  field-cricket-s1020 song-of-nocturnal-insect-1-s0424 nocturnal-insects-4-s1470 campaign-at-night-1-s0110 campaign-at-night-3-s1469 \
  forest-s0100 forest-2-s1348 forest-3-s2715 forest-wind-in-the-trees-s0904 forest-at-night-after-rain-s0555 \
  feet-in-leaves-s0137 broken-twigs-1-s1299 steps-on-the-twigs-s1301 heartbeat-1-s0243 heart-beat-s0218 \
  flight-bird-1-s2891 flight-bird-3-s2893 robin-s1667 blackbird-s3503 birds-waking-s1906 countryside-s0097 bumblebee-1-s1000 \
  wind-and-tree-squeaks-s1051 drops-1-s1384 drops-2-s1385 water-bubbles-s0150
do
  id=${p##*-s}; name=${p%-s*}; out="$id-$name.mp3"
  if [[ ! -s $out ]] || ! ffprobe -v error "$out" 2>/dev/null; then curl -sL -A "$UA" -o "$out" "https://bigsoundbank.com/UPLOAD/mp3/$id.mp3?v=d"; fi
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out" 2>/dev/null || echo BAD)
  echo "$out $dur"
done
