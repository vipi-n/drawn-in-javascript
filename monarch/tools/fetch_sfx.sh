#!/bin/zsh
# Download the CC0 BigSoundBank recordings (Joseph Sardin) used for ambiences and the bird.
set -e
cd "${0:A:h}/../assets/sfx"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
for p in awakening-birds-s0222 countryside-s0097 wind-in-tall-grass-s0908 wind-in-the-trees-s0904 campaign-at-night-4-s1880 eurasian-jay-1-s3453 eurasian-jay-2-s3454 forest-s0100
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
