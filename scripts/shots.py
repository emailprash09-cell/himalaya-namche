import pathlib
PAGE='file://'+pathlib.Path(__file__).resolve().parents[1].joinpath('build/namche.html').as_posix()+'?test'
SHOTS=pathlib.Path(__file__).resolve().parents[1]/'shots'
import sys, json
from playwright.sync_api import sync_playwright
V = {
 'spawn': None,
 'street': "(()=>{const n=window.__namche,L=n.LMK; const x=L.stupa[0]-14,z=L.stupa[1]-10; n.player.x=x;n.player.z=z;n.player.y=n.groundAt(x,z)+1.65;n.player.yaw=Math.atan2(-(L.stupa[0]-x),-(L.stupa[1]-z));n.player.pitch=0.12;return [x,z]})()",
 'center': "(()=>{const n=window.__namche; const x=20,z=-20; n.player.x=x;n.player.z=z;n.player.y=n.groundAt(x,z)+1.65;n.player.yaw=0.6;n.player.pitch=0.05;return 1})()",
 'gompa': "(()=>{const n=window.__namche,g=n.D.lm.gompa; const x=g[0]+22,z=g[1]+18,y=n.groundAt(x,z)+2.2; n.freeCam([x,y,z,0.12,Math.atan2(-(g[0]-x),-(g[1]-z))]); return [x,z]})()",
 'view2': "(()=>{const n=window.__namche,v=n.LMK.view,ev=n.PEAKS[0]; const y=n.groundAt(v[0],v[1])+1.7; n.freeCam([v[0],y,v[1],0.1,Math.atan2(-(ev.x-v[0]),-(ev.z-v[1]))]); return v})()",
 'night2': "(()=>{const n=window.__namche; n.setNight(true); const x=20,z=-20,y=n.groundAt(x,z)+1.7; n.freeCam([x,y,z,0.1,2.4]); return 1})()",
 'ridge2': "(()=>{const n=window.__namche,r=n.LMK.ridge,ev=n.PEAKS[0]; const y=n.groundAt(r[0],r[1])+1.7; n.freeCam([r[0],y,r[1]+6,0.02,Math.atan2(-(ev.x-r[0]),-(ev.z-r[1]))+0.35]); return r})()",
 'view': "(()=>{const n=window.__namche,v=n.LMK.view,ev=n.PEAKS[0]; n.player.x=v[0];n.player.z=v[1];n.player.y=n.groundAt(v[0],v[1])+1.65;n.player.yaw=Math.atan2(-(ev.x-v[0]),-(ev.z-v[1]));n.player.pitch=0.08;return 1})()",
 'ridge': "(()=>{const n=window.__namche,r=n.LMK.ridge,ev=n.PEAKS[0]; n.player.x=r[0];n.player.z=r[1]+6;n.player.y=n.groundAt(r[0],r[1]+6)+1.65;n.player.yaw=Math.atan2(-(ev.x-r[0]),-(ev.z-r[1]))+0.4;n.player.pitch=0.0;return 1})()",
 'night': "(()=>{const n=window.__namche; n.setNight(true); const x=20,z=-20; n.player.x=x;n.player.z=z;n.player.y=n.groundAt(x,z)+1.65;n.player.yaw=2.4;n.player.pitch=0.08;return 1})()",
 'over': "(()=>{const n=window.__namche; n.freeCam([100, 3950, 520, -0.62, 0]); return 1})()",
}
which=sys.argv[1:] or list(V)
with sync_playwright() as pw:
    b=pw.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1100,'height':620})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.on('console', lambda m: print('console', m.type, m.text[:300]) if m.type in ('error','warning') and 'ERR_NAME' not in m.text else None)
    pg.goto(PAGE)
    try: pg.wait_for_function('window.__namcheReady===true', timeout=300000)
    except Exception as e: print('NOT READY', pg.evaluate("document.querySelector('#status').textContent"))
    print('status:', pg.evaluate("document.querySelector('#status').textContent"))
    if 'intro' in which: pg.wait_for_timeout(3000); pg.screenshot(path=str(SHOTS/'intro.png'), timeout=300000); print('shot intro')
    pg.evaluate('window.__namche.start()')
    for k in which:
        if k=='intro': continue
        if V[k]: print(k, pg.evaluate(V[k]))
        pg.wait_for_timeout(3500); pg.screenshot(path=str(SHOTS/(k+'.png')), timeout=300000); print('shot', k)
    b.close()
