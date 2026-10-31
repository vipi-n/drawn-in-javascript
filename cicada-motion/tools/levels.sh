#!/bin/bash
# per-scene loudness of a wav: tools/levels.sh build/score_raw.wav
f=$1
node -e "
const {SCENES}=require('./js/cues');
for(const [id,a,b] of SCENES){
 const {execSync}=require('child_process');
 const o=execSync('ffmpeg -nostdin -ss '+a+' -t '+(b-a)+' -i $f -af ebur128=peak=true -f null - 2>&1 | grep -E \"^ +(I|Peak):\" ').toString().replace(/\s+/g,' ');
 console.log(id.padEnd(12),o);
}"
