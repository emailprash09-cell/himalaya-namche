"""Render views of build/namche.html headless and save PNGs to shots/.

    python scripts/shots.py [views...] [--sw] [--page FILE] [--query real] [--suffix _before]
                            [--poses FILE] [--save-poses FILE]

GPU: by default Chromium runs ANGLE on Direct3D 11 and asks for the high-performance GPU
(an RTX 3050 Ti here: about 20 ms a frame). If that fails, or with --sw, it falls back to
SwiftShader (software, about 2.7 s a frame). The renderer string is printed for every run.

Each view returns a camera pose [x, y, z, pitch, yaw]. --save-poses writes them to JSON;
--poses replays exactly those poses, so a before/after pair is shot from the same camera.
"""
import pathlib, sys, json, time, argparse
from playwright.sync_api import sync_playwright
try: sys.stdout.reconfigure(encoding='utf-8')   # typographic quotes in console output
except Exception: pass

ROOT = pathlib.Path(__file__).resolve().parents[1]
ap = argparse.ArgumentParser()
ap.add_argument('views', nargs='*')
ap.add_argument('--sw', action='store_true', help='force SwiftShader')
ap.add_argument('--page', default=str(ROOT / 'build' / 'namche.html'))
ap.add_argument('--query', default='', help='extra query, e.g. real')
ap.add_argument('--suffix', default='')
ap.add_argument('--out', default=str(ROOT / 'shots'))
ap.add_argument('--poses'); ap.add_argument('--save-poses')
A = ap.parse_args()
PAGE = 'file://' + pathlib.Path(A.page).resolve().as_posix() + '?test' + ('&' + A.query if A.query else '')
OUT = pathlib.Path(A.out); OUT.mkdir(exist_ok=True)

# Each view: JS returning a pose [x, y, z, pitch, yaw] (or null for the player's own spawn camera), plus night on/off.
V = {
 'spawn':  ("(()=>{const n=window.__namche,p=n.player;return [p.x,p.y,p.z,p.pitch,p.yaw]})()", False),
 'center': ("(()=>{const n=window.__namche,x=20,z=-20;return [x,n.groundAt(x,z)+1.65,z,0.05,0.6]})()", False),
 # gompa: walk round the gompa at 28-48 m and take the spot whose eye is nearest the gompa's floor level and
 # whose sight line to it is clear of terrain and other buildings (the old fixed offset stood in a dip below it).
 'gompa':  ("""(()=>{const n=window.__namche,g=n.D.lm.gompa,B=n.BLD||[];const gb=B.find(b=>Math.hypot(b.cx-g[0],b.cz-g[1])<3);
   const gy=gb&&gb.pad!==undefined?gb.pad:n.groundAt(g[0],g[1]),ty=gy+4.5;let best=null;
   const pip=(poly,x,z)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>z)!==(b[1]>z))&&(x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]))c=!c;}return c;};
   for(let r=28;r<=48;r+=4)for(let a=0;a<360;a+=6){const t=a*Math.PI/180,x=g[0]+Math.cos(t)*r,z=g[1]+Math.sin(t)*r,ey=n.groundAt(x,z)+1.7;let ok=true;
     for(let s=0.06;s<0.9&&ok;s+=0.04){const px=x+(g[0]-x)*s,pz=z+(g[1]-z)*s,py=ey+(ty-ey)*s;if(n.groundAt(px,pz)>py-0.3)ok=false;for(const b of B){if(b===gb)continue;if(px<b.bb[0]||px>b.bb[1]||pz<b.bb[2]||pz>b.bb[3])continue;if(py<b.top&&pip(b.poly,px,pz)){ok=false;break;}}}
     if(!ok)continue;const sc=Math.abs(ey-(gy+1.7))+Math.abs(r-36)*0.05;if(!best||sc<best.sc)best={sc,x,z,ey};}
   if(!best){const x=g[0]+30,z=g[1]+30;best={x,z,ey:n.groundAt(x,z)+1.7};}
   const d=Math.hypot(g[0]-best.x,g[1]-best.z);return [best.x,best.ey,best.z,Math.atan2(gy+5-best.ey,d),Math.atan2(-(g[0]-best.x),-(g[1]-best.z))]})()""", False),
 'view2':  ("(()=>{const n=window.__namche,v=n.LMK.view,ev=n.PEAKS[0];return [v[0],n.groundAt(v[0],v[1])+1.7,v[1],0.1,Math.atan2(-(ev.x-v[0]),-(ev.z-v[1]))]})()", False),
 'night2': ("(()=>{const n=window.__namche,x=20,z=-20;return [x,n.groundAt(x,z)+1.7,z,0.1,2.4]})()", True),
 'ridge2': ("(()=>{const n=window.__namche,r=n.LMK.ridge,ev=n.PEAKS[0];return [r[0],n.groundAt(r[0],r[1])+1.7,r[1]+6,0.02,Math.atan2(-(ev.x-r[0]),-(ev.z-r[1]))+0.35]})()", False),
 'stairs': ("(()=>{const n=window.__namche;return n.test&&n.test.stairsPose?n.test.stairsPose():null})()", False),
 'over':   ("[100, 3950, 520, -0.62, 0]", False),
}
RJS = "(()=>{const gl=window.__namche.renderer.getContext();const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})()"
FJS = "new Promise(r=>{let n=0;const t=performance.now();function f(){if(++n>=6)r((performance.now()-t)/6);else requestAnimationFrame(f)}requestAnimationFrame(f)})"
GPU = dict(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force_high_performance_gpu'])
SW = dict(headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
which = A.views or ['intro', 'spawn', 'center', 'gompa', 'view2', 'night2', 'ridge2']
replay = json.loads(pathlib.Path(A.poses).read_text()) if A.poses else {}
saved = {}

def launch(pw, kw):
    b = pw.chromium.launch(**kw)
    pg = b.new_page(viewport={'width': 1100, 'height': 620})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.on('console', lambda m: print('console', m.type, m.text[:300]) if m.type in ('error', 'warning') and 'ERR_NAME' not in m.text and 'GPU stall' not in m.text else None)
    t = time.time(); pg.goto(PAGE)
    try: pg.wait_for_function('window.__namcheReady===true', timeout=600000)
    except Exception: print('NOT READY')
    print('status:', pg.evaluate("document.querySelector('#status').textContent"), f'(load {time.time()-t:.1f} s)')
    return b, pg

with sync_playwright() as pw:
    b = pg = None
    if not A.sw:
        try:
            b, pg = launch(pw, GPU)
            if 'SwiftShader' in pg.evaluate(RJS): b.close(); b = None
        except Exception as e:
            print('GPU launch failed:', str(e)[:200]); b = None
    if b is None: b, pg = launch(pw, SW)
    print('renderer:', pg.evaluate(RJS))
    if 'intro' in which:
        pg.wait_for_timeout(1500); t = time.time(); pg.screenshot(path=str(OUT / ('intro' + A.suffix + '.png')), timeout=600000)
        print(f'shot intro ({time.time()-t:.1f} s)')
    pg.evaluate('window.__namche.start()'); pg.wait_for_timeout(800)
    print(f'frame time: {pg.evaluate(FJS):.0f} ms')
    has_sync = pg.evaluate('typeof window.__namche.syncView === "function"')
    for k in which:
        if k == 'intro': continue
        js, night = V[k]
        pose = replay.get(k) or pg.evaluate(js)
        if pose is None: print('skip', k, '(no pose)'); continue
        saved[k] = pose
        pg.evaluate(f'window.__namche.setNight({str(night).lower()})')
        pg.evaluate(f'window.__namche.freeCam({json.dumps(pose)})')
        vis = pg.evaluate('window.__namche.syncView()') if has_sync else None
        pg.wait_for_timeout(1200 if not A.sw else 4000)
        pg.evaluate("document.querySelector('#toast').classList.remove('on')")
        if has_sync: vis = pg.evaluate('window.__namche.syncView()'); pg.wait_for_timeout(400 if not A.sw else 3000)
        t = time.time(); pg.screenshot(path=str(OUT / (k + A.suffix + '.png')), timeout=600000)
        print(f'shot {k} ({time.time()-t:.1f} s) pose={[round(v, 3) for v in pose]} peaks={vis}')
    b.close()
if A.save_poses: pathlib.Path(A.save_poses).write_text(json.dumps(saved, indent=1))
