"""M2 screenshots in one browser session: spawn FPP/TPP, gate, stupa, the four characters, overview.

  "$NAMCHE_PY" tools/m2_shots.py [--outdir docs/screenshots/m2]

Reuses tools/shot.py's server and GPU flags. Writes <outdir>/<name>.png and <outdir>/shots.json
(camera for every shot, the models that loaded, and stats).
"""
import argparse, json, math, pathlib, time
ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('--outdir', default=str(ROOT / 'docs' / 'screenshots' / 'm2'))
ap.add_argument('--quick', action='store_true', help='only spawn FPP/TPP, a town lane and the full-town overview, with uncapped fps')
ap.add_argument('--suffix', default='')
ap.add_argument('--params', default='', help='extra URL parameters, e.g. &nopost')
A = ap.parse_args()
OUT = pathlib.Path(A.outdir); OUT.mkdir(parents=True, exist_ok=True)

import os, socket, subprocess
from playwright.sync_api import sync_playwright

CLIENT = ROOT / 'client'


def start_server():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    node_dir = ROOT / '.tools' / 'node'
    env = dict(os.environ, PATH=str(node_dir) + os.pathsep + os.environ.get('PATH', ''))
    p = subprocess.Popen([str(node_dir / 'node.exe'), str(CLIENT / 'node_modules' / 'vite' / 'bin' / 'vite.js'),
                          '--port', str(port), '--strictPort', '--host', '127.0.0.1'],
                         cwd=CLIENT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(200):
        try:
            socket.create_connection(('127.0.0.1', port), timeout=0.2).close(); return p, port
        except OSError:
            time.sleep(0.1)
    raise RuntimeError('vite did not start')


GPU = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force_high_performance_gpu']
if A.quick:
    GPU += ['--disable-gpu-vsync', '--disable-frame-rate-limit']
server, port = start_server()
log = {'shots': {}}
errors = []
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True, args=GPU)
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto(f'http://127.0.0.1:{port}/?test=1' + A.params)
        pg.wait_for_function('window.__NAMCHE__ && window.__NAMCHE__.ready === true', timeout=120000)
        pg.evaluate('__NAMCHE__.quiet()')
        pg.wait_for_timeout(1200)
        M = pg.evaluate('window.__MODELS__')
        L = pg.evaluate('__NAMCHE__.layout')
        log['models'] = M
        sp, gt, st = L['spawn'], L['gate'], L['stupa']

        def shot(name, settle=900):
            pg.wait_for_timeout(settle)
            if A.quick:
                pg.wait_for_timeout(1500)
                log.setdefault('fps', {})[name] = pg.evaluate('__NAMCHE__.frameStats(240)')
            name = name + A.suffix
            pg.screenshot(path=str(OUT / f'{name}.png'))
            log['shots'][name] = pg.evaluate('__NAMCHE__.state()')
            print('wrote', name)

        def fly(name, x, y, z, yaw, pitch):
            pg.evaluate(f'__NAMCHE__.fly({x},{y},{z})'); pg.evaluate(f'__NAMCHE__.look({yaw},{pitch})')
            shot(name)
            pg.evaluate('__NAMCHE__.fly(null)')

        def look_at(name, fx, fy, fz, tx, ty, tz):
            yaw = math.degrees(math.atan2(-(tx - fx), -(tz - fz)))
            pitch = math.degrees(math.atan2(ty - fy, math.hypot(tx - fx, tz - fz)))
            fly(name, fx, fy, fz, yaw, pitch)

        if A.quick:
            pg.evaluate('__NAMCHE__.setMode("fpp")'); shot('spawn_fpp', 1200)
            pg.evaluate('__NAMCHE__.setMode("tpp")'); shot('spawn_tpp', 1200)
            pg.evaluate('__NAMCHE__.setMode("fpp")')
            T = json.loads((ROOT / 'data' / 'namche_layout.json').read_text(encoding='utf-8'))
            bx = sorted(b['x'] for b in T['buildings'])[len(T['buildings']) // 2]
            bz = sorted(b['z'] for b in T['buildings'])[len(T['buildings']) // 2]
            best = None
            for path in T['paths']:
                pts = path['p']
                for i in range(len(pts) - 1):
                    d = math.hypot(pts[i][0] - bx, pts[i][1] - bz)
                    if best is None or d < best[0]:
                        best = (d, pts[i], pts[i + 1])
            _, a, b2 = best
            gy = pg.evaluate(f'__NAMCHE__.ground({a[0]},{a[1]})') or 0
            yaw = math.degrees(math.atan2(-(b2[0] - a[0]), -(b2[1] - a[1])))
            fly('lane', a[0], gy + 1.62, a[1], yaw, 3)
            look_at('overview_town', bx + 120, 420, bz + 700, bx, 0, bz)
            log['stats'] = pg.evaluate('__NAMCHE__.stats()')
            b.close()
            raise SystemExit
        # Spawn: M1's camera, untouched.
        pg.evaluate('__NAMCHE__.setMode("fpp")'); shot('spawn_fpp', 1200)
        pg.evaluate('__NAMCHE__.setMode("tpp")'); shot('spawn_tpp', 1200)
        pg.evaluate('__NAMCHE__.setMode("fpp")')
        # The Kani gate from the path, 7 m below its south face, at eye height.
        gy = pg.evaluate(f'__NAMCHE__.ground({gt["x"]},{gt["z"] + 7})') or gt['y']
        look_at('gate', gt['x'] - 1.2, gy + 1.62, gt['z'] + 7.5, gt['x'], gt['y'] + 2.4, gt['z'])
        # The stupa from the south-east corner of the plaza.
        look_at('stupa', st['x'] + 9, st['y'] + 1.8, st['z'] + 13, st['x'], st['y'] + 5.5, st['z'])
        # Each character, 2.4 m in front at eye height.
        for h in (M or {}).get('heroes', []):
            fx = h['x'] - math.sin(h['yaw']) * 2.4; fz = h['z'] - math.cos(h['yaw']) * 2.4
            look_at(h['name'], fx, h['y'] + 1.55, fz, h['x'], h['y'] + 1.0, h['z'])
        # Overview from above the trail, looking north up the entrance.
        look_at('overview', sp['x'] + 6, sp['y'] + 55, sp['z'] + 45, (gt['x'] + st['x']) / 2, st['y'], (gt['z'] + st['z']) / 2)
        log['stats'] = pg.evaluate('__NAMCHE__.stats()')
        b.close()
except SystemExit:
    pass
finally:
    subprocess.run(['taskkill', '/PID', str(server.pid), '/T', '/F'], capture_output=True)
log['pageErrors'] = errors
(OUT / 'shots.json').write_text(json.dumps(log, indent=1))
print('page errors:', len(errors))
