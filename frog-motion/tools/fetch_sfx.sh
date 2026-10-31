#!/bin/zsh
# Download the CC0 BigSoundBank recordings (Joseph Sardin) used for the frog voices and pond ambiences.
set -e
mkdir -p "${0:A:h}/../assets/sfx"
cd "${0:A:h}/../assets/sfx"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
for p in frogs-1-s0997 frogs-2-s0998 one-frog-s0819 pond-in-a-field-s0691 rain-on-puddle-s1290 rain-and-thunder-1-s0124 rain-and-thunder-3-s2717 forest-at-night-after-rain-s0555
do
  id=${p##*-s}
  name=${p%-s*}
  out="$id-$name.mp3"
  if [[ ! -s $out ]] || ! ffprobe -v error "$out" 2>/dev/null; then
    curl -sL -A "$UA" -o "$out" "https://bigsoundbank.com/UPLOAD/mp3/$id.mp3?v=d"
  fi
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")
  echo "$out $dur"
done
