tpl=open('/home/claude/namche/template.html').read()
game=open('/home/claude/namche/game.js').read()
data=open('/home/claude/namche/data.js').read()
i=tpl.index('<script>\n(async function(){'); j=tpl.rindex('</script>')
html=tpl[:i]+'<script>\n'+game+'\n'+tpl[j:]
html=html.replace('Walk the Sherpa capital at 3,440 m. Every building sits where it does on the map you shared, on real terrain. Climb the ridge east of town to find Everest.',
 'Walk the Sherpa capital at 3,440 m: real streets, stairs, lodges and shops from OpenStreetMap on real terrain. Head north up to the Syangboche ridge, or east to the Everest viewpoint.')
html=html.replace('Elevation: NASA SRTM, 90 m. Building layout traced from your map screenshot. Stylized concept, not to be shipped as is.',
 'Map data © OpenStreetMap contributors (ODbL). Elevation: NASA SRTM, 90 m. Stylized concept.')
html=html.replace('Ready. The view is from the Everest viewpoint above town.','')
assert '__THREE_SRC__' in html and '/*__DATA__*/' in html
for src,out in [('vendor/package/build/three.min.js','/home/claude/namche/test.html'),('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','/home/claude/namche/namche.html')]:
    s=html.replace('__THREE_SRC__',src).replace('/*__DATA__*/',data)
    open(out,'w').write(s); print(out,len(s))
