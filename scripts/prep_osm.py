import json, numpy as np, cv2, base64, io, math
from PIL import Image
from scipy import ndimage

LAT0,LON0,MLAT,MLON=27.8050,86.7100,110816.0,98541.0
M=np.load('data/merged.npy')
def xz(c): return ((c[0]-LON0)*MLON, -(c[1]-LAT0)*MLAT)
def elev(x,z,o=3):
    lat=LAT0-np.asarray(z,float)/MLAT; lon=LON0+np.asarray(x,float)/MLON
    return ndimage.map_coordinates(M,[np.atleast_1d((29-lat)*1200).ravel(),np.atleast_1d((lon-86)*1200).ravel()],order=o)

gj=json.load(open('/mnt/user-data/uploads/export.geojson'))
feats=gj['features']

# ---------- town box, aligned to DEM grid ----------
DX,DZ=MLON/1200,MLAT/1200
lonA,lonB=LON0-18000/MLON, LON0+27000/MLON
latA,latB=LAT0-16000/MLAT, LAT0+27000/MLAT
C0=int(np.floor((lonA-86)*1200)); C1=int(np.ceil((lonB-86)*1200))
R0=int(np.floor((29-latB)*1200)); R1=int(np.ceil((29-latA)*1200))
sub=M[R0:R1+1, C0:C1+1]; nz,nx=sub.shape
X0=(86+C0/1200-LON0)*MLON; Z0=-(29-R0/1200-LAT0)*MLAT
dem_b64=base64.b64encode(np.round(sub).astype('<i2').tobytes()).decode()

TXa,TXb,TZa,TZb=-900.0,1100.0,-1160.0,700.0
tc0=int(np.floor((TXa-X0)/DX)); tc1=int(np.ceil((TXb-X0)/DX))
tr0=int(np.floor((TZa-Z0)/DZ)); tr1=int(np.ceil((TZb-Z0)/DZ))
BX0,BX1=X0+tc0*DX, X0+tc1*DX
BZ0,BZ1=Z0+tr0*DZ, Z0+tr1*DZ
print('town box', round(BX0),round(BX1),round(BZ0),round(BZ1),'cells',tc1-tc0,tr1-tr0)

# ---------- mask raster ----------
PX=2.0
MW=int((BX1-BX0)/PX); MH=int((BZ1-BZ0)/PX)
def toPx(x,z): return ((np.asarray(x)-BX0)/PX, (np.asarray(z)-BZ0)/PX)
def ipts(ring):
    a=np.array([toPx(p[0],p[1]) for p in ring],np.float32)
    return a.round().astype(np.int32)
print('mask',MW,MH)

paved=np.zeros((MH,MW),np.uint8); dirt=np.zeros((MH,MW),np.uint8)
water=np.zeros((MH,MW),np.uint8); wood=np.zeros((MH,MW),np.uint8)
scrub=np.zeros((MH,MW),np.uint8); rockm=np.zeros((MH,MW),np.uint8)
grass=np.zeros((MH,MW),np.uint8); walkseed=np.zeros((MH,MW),np.uint8)

BLD=[];PATHS=[];STREAM=[];POI=[];WALLS=[];HELI=[]
CORE=(-430,640,-430,420)   # dense town core for paved streets
def incore(pts):
    xs=[p[0] for p in pts]; zs=[p[1] for p in pts]
    return (max(xs)>CORE[0] and min(xs)<CORE[1] and max(zs)>CORE[2] and min(zs)<CORE[3])

for f in feats:
    p=f.get('properties',{}); g=f['geometry']; t=g['type']
    if 'building' in p and t in ('Polygon','MultiPolygon'):
        rings=g['coordinates'] if t=='Polygon' else g['coordinates'][0]
        ring=[xz(c) for c in rings[0]]
        if len(ring)>2 and ring[0]==ring[-1]: ring=ring[:-1]
        if len(ring)<3: continue
        BLD.append((ring,p))
    elif p.get('highway') in ('path','steps','footway','track','pedestrian') and t=='LineString':
        pts=[xz(c) for c in g['coordinates']]
        PATHS.append((pts,p.get('highway')))
    elif ('waterway' in p) and t=='LineString':
        STREAM.append(([xz(c) for c in g['coordinates']], p.get('waterway')))
    elif p.get('natural')=='water' and t=='Polygon':
        cv2.fillPoly(water,[ipts([xz(c) for c in g['coordinates'][0]])],255)
    elif p.get('natural') and t=='Polygon':
        tgt={'wood':wood,'scrub':scrub,'rock':rockm,'grassland':grass}.get(p['natural'])
        if tgt is not None: cv2.fillPoly(tgt,[ipts([xz(c) for c in g['coordinates'][0]])],255)
    elif p.get('barrier')=='wall' and t in ('LineString','Polygon'):
        cs=g['coordinates'] if t=='LineString' else g['coordinates'][0]
        WALLS.append([xz(c) for c in cs])
    elif p.get('aeroway')=='helipad' and t=='Polygon':
        ring=[xz(c) for c in g['coordinates'][0]]
        HELI.append((ring,p))
    elif t=='Point':
        POI.append((xz(g['coordinates']), p))

# rasterize paths
for pts,kind in PATHS:
    a=ipts(pts)
    core=incore(pts)
    w=int(round((3.2 if core else 1.9)/PX))
    cv2.polylines(paved if core else dirt, [a], False, 255, max(1,w))
    cv2.polylines(walkseed,[a],False,255,max(1,int(round(9/PX))))
for pts,kind in STREAM:
    cv2.polylines(water,[ipts(pts)],False,255,max(1,int(round(2.4/PX))))

bmask=np.zeros((MH,MW),np.uint8)
for ring,p in BLD:
    cv2.fillPoly(bmask,[ipts(ring)],255)
walkseed=cv2.max(walkseed, cv2.dilate(bmask,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(16/PX)|1,int(16/PX)|1))))

walk=cv2.morphologyEx(walkseed,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(34/PX)|1,int(34/PX)|1)))
walk=ndimage.binary_fill_holes(walk>0).astype(np.uint8)*255
n,lab,st,_=cv2.connectedComponentsWithStats(walk,8)
walk=((lab==(1+np.argmax(st[1:,4])))*255).astype(np.uint8)
walk=cv2.GaussianBlur(walk,(0,0),2.0); walk=((walk>110)*255).astype(np.uint8)
print('walk area km2', round(walk.sum()/255*PX*PX/1e6,3))

def pack(chs):
    img=np.dstack(chs).astype(np.uint8)
    buf=io.BytesIO(); Image.fromarray(img,'RGBA').save(buf,'PNG',optimize=True)
    return base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())
m1,s1=pack([cv2.GaussianBlur(paved,(0,0),0.8),cv2.GaussianBlur(dirt,(0,0),0.8),cv2.GaussianBlur(water,(0,0),0.6),np.full((MH,MW),255,np.uint8)])
bufw=io.BytesIO(); Image.fromarray(walk,'L').save(bufw,'PNG',optimize=True); m3=base64.b64encode(bufw.getvalue()).decode()
m2,s2=pack([cv2.GaussianBlur(wood,(0,0),2.0),cv2.GaussianBlur(scrub,(0,0),2.0),cv2.GaussianBlur(cv2.max(rockm,grass),(0,0),2.0),np.full((MH,MW),255,np.uint8)])
print('mask png',s1,s2)

# attach POI point tags to the building polygon that contains them
BPOLY=[np.array(r,np.float32).reshape(-1,1,2) for r,_ in BLD]
for (px,pz),pp in POI:
    if not (pp.get('tourism') or pp.get('amenity') or pp.get('shop')): continue
    for i,poly in enumerate(BPOLY):
        if cv2.pointPolygonTest(poly,(float(px),float(pz)),False)>=0:
            tg=BLD[i][1]
            for k,v in pp.items():
                if k not in tg or k=='name': tg[k]=v
            break

# ---------- buildings ----------
rng=np.random.default_rng(7)
def kind_of(p):
    n=(p.get('name') or '').lower()
    if p.get('building')=='monastery' or p.get('amenity') in ('monastery','place_of_worship') or 'gompa' in n: return 'gompa'
    if p.get('tourism')=='museum' or 'museum' in n or 'संग्रहालय' in (p.get('name') or ''): return 'museum'
    if p.get('amenity')=='school' or 'विद्यालय' in (p.get('name') or '') or 'school' in n: return 'school'
    if p.get('building')=='hospital' or p.get('amenity') in ('hospital','clinic','doctors') or 'स्वास्थ्य' in (p.get('name') or ''): return 'civic'
    if p.get('tourism') in ('guest_house','hotel') or p.get('building')=='hotel' or any(k in n for k in ('lodge','hotel','guest','inn','resort','home')): return 'lodge'
    if p.get('amenity') in ('restaurant','cafe','bar','pub','bank','pharmacy') or 'shop' in p or any(k in n for k in ('cafe','bakery','restaurant','bar')): return 'shop'
    return 'house'
def simplify(ring,tol=0.7):
    a=np.array(ring,np.float32).reshape(-1,1,2)
    s=cv2.approxPolyDP(a,tol,True)[:,0,:]
    if len(s)<3: s=np.array(ring,np.float32)
    if len(s)>14:
        s=cv2.approxPolyDP(a,1.6,True)[:,0,:]
    return s
def obb(pts):
    (cx,cy),(w,h),ang=cv2.minAreaRect(pts.astype(np.float32))
    a=math.radians(ang); ux,uz=math.cos(a),math.sin(a)
    if w<h: w,h=h,w; ux,uz=-uz,ux
    return cx,cy,w,h,ux,uz
ROOFW=[0.30,0.17,0.17,0.14,0.12,0.10]  # blue, teal, green, red, silver, darkgreen
WALLW=[0.42,0.28,0.16,0.14]            # stone, whitewash, wood, plaster
out=[]
for ring,p in BLD:
    s=simplify(ring)
    if cv2.contourArea(s.astype(np.float32))<9: continue
    cx,cz,w,h,ux,uz=obb(s)
    area=float(cv2.contourArea(s.astype(np.float32)))
    k=kind_of(p)
    base={'lodge':3,'shop':2,'house':2,'gompa':2,'museum':2,'school':2,'civic':2}[k]
    f=base+(1 if area>170 else 0)+(1 if area>420 and k in('lodge','shop') else 0)+(1 if rng.random()<0.3 else 0)
    if k in ('gompa',): f=2
    if k in ('school','civic','museum'): f=min(f,2)
    f=int(min(max(f,1),5))
    if area<36: f=1
    roof=int(rng.choice(6,p=ROOFW)); wall=int(rng.choice(4,p=WALLW))
    if k=='gompa': wall=1
    frame=int(rng.choice(4,p=[0.30,0.30,0.22,0.18]))
    bal=1 if (k in ('lodge','shop') and f>=3 and rng.random()<0.45) else 0
    pts=[[round(float(q[0]),1),round(float(q[1]),1)] for q in s]
    out.append(dict(p=pts,f=f,r=roof,w=wall,fr=frame,k=k,b=bal,
                    u=[round(ux,3),round(uz,3)],c=[round(float(cx),1),round(float(cz),1)],
                    d=[round(float(w),1),round(float(h),1)],n=(p.get('name') or '')[:38]))
print('buildings out',len(out),'kinds',{k:sum(1 for b in out if b['k']==k) for k in set(b['k'] for b in out)})

# ---------- paths as polylines for geometry (stairs, edging) ----------
PP=[]
for pts,kind in PATHS:
    a=[[round(q[0],1),round(q[1],1)] for q in pts]
    if len(a)<2: continue
    xs=[q[0] for q in a]; zs=[q[1] for q in a]
    if max(xs)<BX0-50 or min(xs)>BX1+50 or max(zs)<BZ0-50 or min(zs)>BZ1+50: continue
    PP.append({'p':a,'s':1 if kind=='steps' else 0,'c':1 if incore(pts) else 0})
WW=[[[round(q[0],1),round(q[1],1)] for q in w] for w in WALLS]
SS=[[[round(q[0],1),round(q[1],1)] for q in pts] for pts,_ in STREAM]
print('paths',len(PP),'walls',len(WW),'streams',len(SS))

# ---------- POIs ----------
def poi_kind(p):
    if p.get('aeroway')=='helipad': return 'helipad'
    if p.get('historic')=='wayside_shrine': return 'shrine'
    if p.get('historic')=='memorial': return 'memorial'
    if p.get('tourism')=='viewpoint': return 'viewpoint'
    if p.get('amenity')=='drinking_water': return 'water'
    if p.get('tourism')=='information': return 'info'
    return None
PO=[]
for (x,z),p in POI:
    k=poi_kind(p)
    if not k: continue
    PO.append({'x':round(x,1),'z':round(z,1),'k':k,'n':(p.get('name') or '')[:34]})
for ring,p in HELI:
    a=np.array(ring); PO.append({'x':round(float(a[:,0].mean()),1),'z':round(float(a[:,1].mean()),1),'k':'helipad','n':(p.get('name') or '')[:34],'r':round(float(np.hypot(a[:,0]-a[:,0].mean(),a[:,1]-a[:,1].mean()).max()),1)})
print('poi',len(PO), {k:sum(1 for q in PO if q['k']==k) for k in set(q['k'] for q in PO)})

peaks=[('Everest',8849,27.9883,86.9250),('Lhotse',8516,27.9617,86.9342),('Nuptse',7861,27.9675,86.8867),
 ('Ama Dablam',6812,27.8608,86.8617),('Thamserku',6623,27.7900,86.7850),('Kangtega',6782,27.7925,86.8167),
 ('Kongde Ri',6187,27.7933,86.6425),('Cholatse',6440,27.9200,86.7667)]
P=[]
for n,h,la,lo in peaks:
    x=(lo-LON0)*MLON; z=-(la-LAT0)*MLAT
    P.append(dict(n=n,h=h,x=round(x,1),z=round(z,1),y=round(float(elev(x,z)[0]),1)))

# spawn: on the main trail at the south-east entrance to town, facing up the street
def walk_at(x,z):
    px,pz=toPx(x,z); 
    if px<0 or pz<0 or px>=MW or pz>=MH: return 0
    return walk[int(pz),int(px)]
cands=[]
for pts,kind in PATHS:
    for q in pts:
        if 120<q[0]<620 and 180<q[1]<520 and walk_at(*q)>0: cands.append(q)
sp=min(cands,key=lambda q:-(q[1]))if cands else (300.0,300.0)
lm={'spawn':[round(sp[0],1),round(sp[1],1)],'face':[60.0,-40.0],
    'view':[523.2,270.2],'ridge':[58.7,-880.5],'gompa':None}
for b in out:
    if b['k']=='gompa': lm['gompa']=b['c']; break
data=dict(dem=dict(nx=int(nx),nz=int(nz),x0=X0,z0=Z0,dx=DX,dz=DZ,b64=dem_b64),
          town=dict(c0=tc0,c1=tc1,r0=tr0,r1=tr1),
          mask=dict(w=MW,h=MH,px=PX,x0=BX0,z0=BZ0,a=m1,b=m2,c=m3),
          buildings=out, paths=PP, walls=WW, streams=SS, poi=PO, peaks=P, lm=lm,
          geo=dict(lat0=LAT0,lon0=LON0,mlat=MLAT,mlon=MLON))
js='window.NAMCHE='+json.dumps(data,separators=(',',':'))+';'
open('data.js','w').write(js)
print('data.js',len(js),'spawn',lm['spawn'],'gompa',lm['gompa'])
