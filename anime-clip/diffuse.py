import torch, cv2, numpy as np, sys, os, time
from diffusers import StableDiffusionControlNetImg2ImgPipeline, ControlNetModel, LCMScheduler
from PIL import Image
import looks

DW, DH = 896, 504
OUT = '/tmp/an/diff'

BASE = 'masterpiece, best quality, anime screencap, official art, 1boy, detailed anime face, large expressive eyes, clean lineart, cel shading, '
NEG = 'photo, realistic, 3d, lowres, bad anatomy, bad hands, blurry, jpeg artifacts, watermark, text, signature, deformed face, extra limbs, multiple people, nsfw'

STYLE = {
    'naruto1': 'naruto shippuden anime style, studio pierrot, thick black outlines, bright saturated colors, konoha village',
    'naruto2': 'naruto shippuden anime style, studio pierrot, thick black outlines, orange sunset, dramatic, shounen',
    'bebop': 'cowboy bebop anime style, sunrise 1998, retro 90s cel animation, muted warm colors, film grain, sketchy lines',
    'champloo': 'samurai champloo anime style, manglobe, rough ink brush lines, earthy faded colors, hip hop',
    'aot1': 'attack on titan anime style, wit studio, gritty, dark, heavy shading, hatching, muted brown and teal',
    'aot2': 'attack on titan the final season anime style, mappa, gritty, dark red sky, intense glare, heavy shading',
    'mha': 'my hero academia anime style, studio bones, bold outlines, vivid saturated colors, heroic',
    'vinland': 'vinland saga anime style, wit studio, realistic proportions, painterly, muted earthy colors, soft light',
    'yyh': 'yu yu hakusho anime style, studio pierrot 1992, 90s cel animation, bold lines, spirit energy glow',
    'ds1': 'demon slayer kimetsu no yaiba anime style, ufotable, sharp lineart, vivid colors, water breathing, glowing',
    'ds2': 'demon slayer kimetsu no yaiba anime style, ufotable, sharp lineart, vivid colors, water splash, glowing',
    'shield': 'rising of the shield hero anime style, kinema citrus, fantasy, soft bright colors, bloom',
    'jjk': 'jujutsu kaisen anime style, mappa, dark moody, sharp black lines, cursed energy, purple and blue lighting',
    'fmab': 'fullmetal alchemist brotherhood anime style, studio bones, warm golden colors, alchemy, clean lineart',
}

# (first src frame, description) - last entry <= src idx wins
SCENES = [
    (0, 'handsome man with short dark hair and stubble, wearing a green shirt, talking, lush green garden background'),
    (80, 'man with messy brown hair, wearing a blue shirt, cooking in a cramped trailer kitchen, warm light'),
    (170, 'blond man in a navy blue suit, drinking and dancing on a wooden bench, harbour, daytime'),
    (403, 'man in a white shirt climbing into a van, from behind, dim interior'),
    (463, 'race car driver in a white racing suit and headset, pit lane, evening light'),
    (521, 'shirtless man with tattoos in a shower, steam, wet hair'),
    (550, 'man with tattooed arm eating at a diner counter, warm lamp light'),
    (579, 'man with brown hair in a blue shirt driving a convertible car, sunny'),
    (609, 'man with short blond hair in a white shirt on a sailboat, blue sea and sky'),
    (638, 'man in a dark suit with arms spread wide next to a swimming pool, smiling'),
    (667, 'man in a neon green jacket, nightclub, neon lights'),
    (695, 'man wearing sunglasses and white shirt with both palms up, palm trees, blue sky'),
    (724, 'man wearing sunglasses leaning out of a speedboat, ocean spray, sunlight'),
    (782, 'two men shaking hands on a beach, ocean'),
    (812, 'blond man with a beard and serious expression, close up'),
]


def prompt_for(i):
    s = looks.src_idx(i)
    desc = [d for st, d in SCENES if s >= st][-1]
    key = looks.shot_info(i)[1]
    return STYLE[key] + ', anime screencap, 1boy, ' + desc + ', anime face, big eyes, cel shading, masterpiece'


def lines_img(src_bgr):
    g = cv2.cvtColor(cv2.resize(src_bgr, (DW, DH), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    g1 = cv2.GaussianBlur(g, (0, 0), 1.4)
    g2 = cv2.GaussianBlur(g, (0, 0), 2.4)
    d = g1 - 0.97 * g2
    ln = 1 - (1 + np.tanh(40 * (d + 0.012)))
    ln = np.clip(np.where(d >= -0.012, 0.0, 1 + np.tanh(40 * (d + 0.012))) * -1 + 1, 0, 1)
    ln = np.clip(1 - np.where(d >= -0.012, 1.0, 1 + np.tanh(40 * (d + 0.012))), 0, 1)
    ln = (ln * 255).astype(np.uint8)
    return cv2.cvtColor(ln, cv2.COLOR_GRAY2RGB)


def init_img(src_bgr):
    s = cv2.resize(src_bgr, (DW, DH), interpolation=cv2.INTER_AREA)
    s = cv2.pyrMeanShiftFiltering(s, 7, 24, maxLevel=1)
    return cv2.cvtColor(s, cv2.COLOR_BGR2RGB)


def load():
    cn = ControlNetModel.from_pretrained('/tmp/m/cn_lineart', variant='fp16', torch_dtype=torch.float16)
    pipe = StableDiffusionControlNetImg2ImgPipeline.from_pretrained('/tmp/m/anything5', controlnet=cn, torch_dtype=torch.float16,
                                                                    safety_checker=None, requires_safety_checker=False)
    pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
    pipe.load_lora_weights('/tmp/m/lcm')
    pipe.fuse_lora()
    pipe.to('mps')
    pipe.set_progress_bar_config(disable=True)
    return pipe


def gen(pipe, i, strength=0.62, steps=8, cscale=0.9, guidance=1.3):
    src = cv2.imread(f'/tmp/an/src/{i:04d}.png')
    k = looks.shot_info(i)[0]
    g = torch.Generator('cpu').manual_seed(1234 + k)
    r = pipe(prompt=prompt_for(i), negative_prompt=NEG, image=Image.fromarray(init_img(src)), control_image=Image.fromarray(lines_img(src)),
             strength=strength, num_inference_steps=steps, guidance_scale=guidance, controlnet_conditioning_scale=cscale,
             generator=g, width=DW, height=DH)
    return cv2.cvtColor(np.array(r.images[0]), cv2.COLOR_RGB2BGR)


if __name__ == '__main__':
    mode = sys.argv[1]
    pipe = load()
    os.makedirs(OUT, exist_ok=True)
    if mode == 'test':
        st = float(sys.argv[2])
        tiles = []
        for i in [int(x) for x in sys.argv[3:]]:
            t = time.time()
            im = gen(pipe, i, strength=st)
            print(i, round(time.time() - t, 1), flush=True)
            src = cv2.resize(cv2.imread(f'/tmp/an/src/{i:04d}.png'), (DW, DH))
            tiles.append(np.hstack([cv2.resize(src, (640, 360)), cv2.resize(im, (640, 360))]))
        cv2.imwrite('/tmp/an/dtest.jpg', np.vstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 88])
    else:
        wid, nw = int(sys.argv[2]), int(sys.argv[3])
        st = float(sys.argv[4])
        for i in range(wid * 2, looks.N_FRAMES, 2 * nw):
            p = f'{OUT}/{i:04d}.png'
            if os.path.exists(p):
                continue
            t = time.time()
            cv2.imwrite(p, gen(pipe, i, strength=st))
            print(i, round(time.time() - t, 1), flush=True)
