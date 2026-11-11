"""Headless driver for the M1 client: screenshots, the walk test and a perf run, on the real GPU.

  "$NAMCHE_PY" tools/shot.py                 # spawn shots (FPP and TPP) into docs/screenshots/
  "$NAMCHE_PY" tools/shot.py --walk          # bridge -> gate -> stupa kora clockwise, FPP then TPP
  "$NAMCHE_PY" tools/shot.py --perf          # frame times with the frame-rate cap off
  "$NAMCHE_PY" tools/shot.py --pose x,z,yaw,pitch[,mode] --out name

Starts its own Vite dev server on a free port and stops it (and the browser) when done.
"""
import argparse, json, math, os, socket, subprocess, sys, time, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
CLIENT = ROOT / 'client'
ap = argparse.ArgumentParser()
ap.add_argument('--walk', action='store_true')
ap.add_argument('--perf', action='store_true')
ap.add_argument('--pose', default=None)
ap.add_argument('--fly', default=None, help='x,y,z,yawDeg,pitchDeg free camera')
ap.add_argument('--out', default=None)
ap.add_argument('--outdir', default=str(ROOT / 'docs' / 'screenshots'))
ap.add_argument('--eval', default=None, help='JS expression to evaluate and print')
ap.add_argument('--webgl', action='store_true')
ap.add_argument('--size', default='1920x1080')
ap.add_argument('--keep', action='store_true', help='also write intermediate shots to out/m1-arrival')
A = ap.parse_args()
W, H = map(int, A.size.split('x'))
OUTDIR = pathlib.Path(A.outdir); OUTDIR.mkdir(parents=True, exist_ok=True)
SCRATCH = ROOT / 'out' / 'm1-arrival'; SCRATCH.mkdir(parents=True, exist_ok=True)


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def start_server():
    port = free_port()
    node_dir = ROOT / '.tools' / 'node'
    env = dict(os.environ, PATH=str(node_dir) + os.pathsep + os.environ.get('PATH', ''))
    vite = CLIENT / 'node_modules' / 'vite' / 'bin' / 'vite.js'
    node = node_dir / ('node.exe' if os.name == 'nt' else 'node')
    p = subprocess.Popen([str(node), str(vite), '--port', str(port), '--strictPort', '--host', '127.0.0.1'],
                         cwd=CLIENT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(200):
        try:
            socket.create_connection(('127.0.0.1', port), timeout=0.2).close(); return p, port
        except OSError:
            time.sleep(0.1)
    raise RuntimeError('vite did not start')


def stop_server(p):
    if os.name == 'nt':
        subprocess.run(['taskkill', '/PID', str(p.pid), '/T', '/F'], capture_output=True)
    else:
        p.terminate()


GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force_high_performance_gpu',
            '--enable-unsafe-webgpu']
if A.perf:
    GPU_ARGS += ['--disable-gpu-vsync', '--disable-frame-rate-limit']

problems = []


def on_console(m):
    if m.type in ('error', 'warning'):
        txt = m.text[:400]
        problems.append(f'{m.type}: {txt}')
        print('console', m.type, txt)


server, port = start_server()
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True, args=GPU_ARGS)
        pg = b.new_page(viewport={'width': W, 'height': H})
        pg.on('pageerror', lambda e: (problems.append(f'pageerror: {e}'), print('PAGEERROR', e)))
        pg.on('console', on_console)
        url = f'http://127.0.0.1:{port}/?test=1' + ('&webgl' if A.webgl else '')
        t = time.time()
        pg.goto(url)
        pg.wait_for_function('window.__NAMCHE__ && window.__NAMCHE__.ready === true', timeout=180000)
        print(f'ready in {time.time() - t:.1f} s (boot {pg.evaluate("__NAMCHE__.loadMs"):.0f} ms), backend {pg.evaluate("__NAMCHE__.backend")}')
        pg.evaluate('__NAMCHE__.quiet()')
        pg.wait_for_timeout(1500)

        def shot(name, settle=900):
            pg.wait_for_timeout(settle)
            path = OUTDIR / f'{name}.png' if not A.keep else SCRATCH / f'{name}.png'
            pg.screenshot(path=str(path))
            print('wrote', path)

        if A.eval:
            print('EVAL', json.dumps(pg.evaluate(A.eval)))
        elif A.fly:
            x, y, z, yaw, pitch = map(float, A.fly.split(','))
            pg.evaluate(f'__NAMCHE__.fly({x},{y},{z})'); pg.evaluate(f'__NAMCHE__.look({yaw},{pitch})')
            shot(A.out or 'fly')
        elif A.pose:
            v = A.pose.split(',')
            x, z, yaw, pitch = map(float, v[:4])
            pg.evaluate(f'__NAMCHE__.teleport({x},{z},{yaw})')
            pg.evaluate(f'__NAMCHE__.look({yaw},{pitch})')
            if len(v) > 4:
                pg.evaluate(f'__NAMCHE__.setMode("{v[4]}")')
            shot(A.out or 'pose')
        elif A.walk:
            L = pg.evaluate('__NAMCHE__.layout')
            route = [(p[0], p[1]) for p in L['route']['pts']]
            br, sp, gt, st = L['bridge'], L['spawn'], L['gate'], L['stupa']
            # Start on the far side of the bridge, cross it, up the path, through the gate.
            def near_idx(x, z): return min(range(len(route)), key=lambda i: (route[i][0] - x) ** 2 + (route[i][1] - z) ** 2)
            i0 = max(0, near_idx(br['x'], br['z']) - 4)
            path = route[i0::3] + [route[-1]]
            hw, hd = L['plaza']['w'] / 2 - 2.0, L['plaza']['d'] / 2 - 1.4
            sx, sz = st['x'], st['z']
            # Kora, clockwise seen from above (north up): south -> west -> north -> east -> south.
            kora = [(sx, sz + hd), (sx - hw, sz + hd), (sx - hw, sz - hd), (sx + hw, sz - hd), (sx + hw, sz + hd), (sx, sz + hd)]
            results = {}
            for mode, sprint in (('fpp', False), ('tpp', True)):
                pg.evaluate(f'__NAMCHE__.teleport({route[i0][0]},{route[i0][1]})')
                pg.wait_for_timeout(300)
                r = pg.evaluate('([p, o]) => __NAMCHE__.walkRoute(p, o)', [path + kora, {'mode': mode, 'sprint': sprint, 'timeoutS': 300}])
                end = pg.evaluate('__NAMCHE__.state()')
                # Clockwise check: signed area of the kora part of the walked path (x east, z south).
                kp = [p for p in r['path'] if math.hypot(p[0] - sx, p[2] - sz) < max(hw, hd) + 3]
                area = sum(kp[i][0] * kp[i + 1][2] - kp[i + 1][0] * kp[i][2] for i in range(len(kp) - 1)) / 2 if len(kp) > 2 else 0
                r['koraSignedArea'] = round(area, 1)
                r['clockwise'] = area > 0  # with z pointing south, clockwise from above has positive area here
                r['end'] = end
                r['walked_m'] = round(end['walked'], 1)
                pts = r.pop('path')
                r['samples'] = len(pts)
                results[mode] = r
                print(mode, json.dumps(r))
                shot(f'm1_walk_end_{mode}', 300)
            (SCRATCH / 'walk.json').write_text(json.dumps(results, indent=1))
        elif A.perf:
            L = pg.evaluate('__NAMCHE__.layout')
            sp, st, gt = L['spawn'], L['stupa'], L['gate']
            poses = [('spawn', sp['x'], sp['z'], None, 'fpp'), ('spawn_tpp', sp['x'], sp['z'], None, 'tpp'),
                     ('gate', gt['x'], gt['z'] + 4, 0, 'fpp'), ('plaza', st['x'], st['z'] + 7.5, 0, 'tpp'),
                     ('look_town', st['x'] + 6, st['z'] + 7.5, 10, 'fpp')]
            res = {}
            for name, x, z, yaw, mode in poses:
                if yaw is None:
                    pg.evaluate('__NAMCHE__.setMode("fpp")')
                else:
                    pg.evaluate(f'__NAMCHE__.teleport({x},{z},{yaw})'); pg.evaluate(f'__NAMCHE__.look({yaw},-3)')
                pg.evaluate(f'__NAMCHE__.setMode("{mode}")')
                pg.wait_for_timeout(2500)
                fs = pg.evaluate('__NAMCHE__.frameStats(300)')
                res[name] = fs
                print(name, json.dumps({k: round(v, 2) if isinstance(v, float) else v for k, v in fs.items()}))
            (SCRATCH / 'perf.json').write_text(json.dumps(res, indent=1))
        else:
            pg.evaluate('__NAMCHE__.setMode("fpp")')
            shot('m1_spawn_fpp', 1500)
            pg.evaluate('__NAMCHE__.setMode("tpp")')
            shot('m1_spawn_tpp', 1200)
        print('stats', json.dumps(pg.evaluate('__NAMCHE__.stats()')))
        b.close()
finally:
    stop_server(server)
print('console problems:', len(problems))
for p in problems[:20]:
    print(' ', p)
sys.exit(1 if any(p.startswith('pageerror') for p in problems) else 0)
