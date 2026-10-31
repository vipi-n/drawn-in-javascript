const core=require('../js/core');const {C,W,H}=core;core.fonts();
const cz=require('../js/cicada');
const cv=C.createCanvas(1080,1080),ctx=cv.getContext('2d');
let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#5a4a3a');g.addColorStop(1,'#2b211b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
const mode=process.argv[2]||'nymph';
if(mode==='nymph'){
cz.nymph(ctx,{x:420,y:260,sc:1.1,legsMode:'walk',walk:.2,ground:100});
cz.nymph(ctx,{x:420,y:620,sc:1.1,legsMode:'dig',dig:.3,ground:100,young:.9});
cz.nymph(ctx,{x:850,y:800,sc:.9,rot:-Math.PI/2,legsMode:'climb',ground:100});
} else {
cz.adult(ctx,{x:540,y:300,sc:1.2,m:1,legs:'perch',ground:118});
cz.adult(ctx,{x:540,y:760,sc:1.2,m:.05,wingSize:.3,crumple:.8,legs:'cling',ground:118});
}
require('fs').writeFileSync(process.argv[3]||'/tmp/rig_'+mode+'.png',cv.toBuffer('image/png'));
